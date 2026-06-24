// If this script is bound to your Google Sheet, leave SPREADSHEET_ID blank.
// If it is a standalone Apps Script project, paste the Sheet ID here.
const SPREADSHEET_ID = '1970xg3EdpP5wV2beiaYvR-MzhD2g-vlMohATbA5GyK0';
const SHEET_GID = 901577030;
const SHEET_NAME = 'S3 GYM LEADS';
const ADMIN_EMAIL = '';
const CRM_HEADERS = [
  'Received At',
  'Name',
  'Phone',
  'WhatsApp',
  'Email',
  'Plan',
  'Membership Value',
  'Goal',
  'Status',
  'Priority',
  'Follow Up Done',
  'Next Follow Up',
  'Last Contacted',
  'Notes',
  'Subject',
  'Message',
  'Source',
  'Lead Age',
  'ID',
  'Type',
  'Created At'
];

function doPost(e) {
  try {
    const sheet = getSheet();
    const data = JSON.parse((e.postData && e.postData.contents) || '{}');

    ensureHeaders(sheet);
    appendCrmRow(sheet, data);

    sendNotificationEmail(data);

    return jsonResponse({ success: true });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);

    return jsonResponse({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

function doGet() {
  try {
    const sheet = getSheet();

    return jsonResponse({
      success: true,
      sheet: sheet.getName(),
      headers: getHeaders(sheet)
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

function sendNotificationEmail(data) {
  const recipient = data.notificationEmail || ADMIN_EMAIL;
  if (!recipient) return;

  const submissionType = data.type === 'contact' ? 'Contact form' : 'Free trial form';
  const subject = `New ${submissionType} submission - ${data.name || 'S3 Fitness'}`;
  const plan = data.plan || data.planName || data.planId || '-';
  const body = [
    `New ${submissionType} submission`,
    '',
    `Name: ${data.name || '-'}`,
    `Phone: ${data.phone || '-'}`,
    `Email: ${data.email || '-'}`,
    `Plan: ${plan}`,
    `Goal: ${data.goal || '-'}`,
    `Subject: ${data.subject || '-'}`,
    `Message: ${data.message || '-'}`,
    `Status: ${normalizeStatus(data.status)}`,
    `Created At: ${data.createdAt || new Date().toISOString()}`
  ].join('\n');

  try {
    MailApp.sendEmail({
      to: recipient,
      subject,
      body
    });
  } catch (error) {
    console.error(`Notification email failed: ${error.message}`);
  }
}

function getSheet() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('No spreadsheet found. Open Apps Script from the Sheet, or set SPREADSHEET_ID.');
  }

  const sheetByGid = SHEET_GID
    ? spreadsheet.getSheets().find((sheet) => sheet.getSheetId() === SHEET_GID)
    : null;

  return sheetByGid || spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;

  sheet.appendRow(CRM_HEADERS);
  ensureFollowUpCheckboxes(sheet, 2, sheet.getMaxRows() - 1);
}

function ensureFollowUpCheckboxes(sheet, startRow, rowCount) {
  const headers = getHeaders(sheet);
  const followUpColumn = headers.indexOf('Follow Up Done') + 1;
  if (!followUpColumn || rowCount < 1) return;

  const range = sheet.getRange(startRow, followUpColumn, rowCount, 1);

  range.insertCheckboxes();
}

function appendCrmRow(sheet, data) {
  const headers = getHeaders(sheet);
  const rowNumber = sheet.getLastRow() + 1;
  const row = headers.map((header) => getColumnValue(header, data, rowNumber, headers));

  sheet.appendRow(row);
  ensureFollowUpCheckboxes(sheet, rowNumber, 1);
}

function getHeaders(sheet) {
  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map((header) => String(header || '').trim());
}

function getColumnValue(header, data, rowNumber, headers) {
  const status = normalizeStatus(data.status);
  const createdAt = data.createdAt || new Date().toISOString();
  const receivedAtIndex = headers.indexOf('Received At') + 1;
  const receivedAtColumn = receivedAtIndex > 0 ? getA1Column(receivedAtIndex) : 'A';

  switch (header) {
    case 'Received At':
      return new Date();
    case 'Name':
      return data.name || '';
    case 'Phone':
      return data.phone || '';
    case 'WhatsApp':
      return getWhatsAppFormula(data.phone);
    case 'Email':
      return data.email || '';
    case 'Plan':
      return data.plan || data.planName || data.planId || '';
    case 'Goal':
      return data.goal || '';
    case 'Status':
      return status;
    case 'Priority':
      return getPriorityForStatus(status);
    case 'Follow Up Done':
      return false;
    case 'Next Follow Up':
    case 'Last Contacted':
    case 'Notes':
      return '';
    case 'Message':
      return data.message || '';
    case 'Source':
      return data.source || getDefaultSource();
    case 'Membership Value':
      return Number(data.membershipValue || data.planPrice || 0) || '';
    case 'Lead Age':
      return `=IF(${receivedAtColumn}${rowNumber}="","",TODAY()-INT(${receivedAtColumn}${rowNumber}))`;
    case 'Subject':
      return data.subject || '';
    case 'ID':
      return data.id || '';
    case 'Type':
      return data.type || '';
    case 'Created At':
      return createdAt;
    default:
      return '';
  }
}

function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME || e.range.getRow() === 1) return;

  const headers = getHeaders(sheet);
  const statusColumn = headers.indexOf('Status') + 1;
  const priorityColumn = headers.indexOf('Priority') + 1;
  if (!statusColumn || !priorityColumn) return;

  const firstColumn = e.range.getColumn();
  const lastColumn = firstColumn + e.range.getNumColumns() - 1;
  if (statusColumn < firstColumn || statusColumn > lastColumn) return;

  const statusOffset = statusColumn - firstColumn;
  const values = e.range.getValues();
  const priorities = values.map((row) => [getPriorityForStatus(normalizeStatus(row[statusOffset]))]);

  sheet.getRange(e.range.getRow(), priorityColumn, priorities.length, 1).setValues(priorities);
}

function normalizeStatus(status) {
  const value = String(status || '').trim();
  if (!value) return 'New Lead';
  if (value.toLowerCase() === 'new') return 'New Lead';

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getPriorityForStatus(status) {
  const value = String(status || '').toLowerCase();

  if (['converted', 'closed', 'lost', 'not interested'].indexOf(value) >= 0) return 'Low';
  if (['contacted', 'trial booked', 'visited'].indexOf(value) >= 0) return 'Medium';
  return 'High';
}

function getDefaultSource() {
  return 'Website';
}

function getWhatsAppFormula(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';

  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `=HYPERLINK("https://wa.me/${normalized}","💬 WhatsApp")`;
}

function getA1Column(columnNumber) {
  let column = '';

  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    columnNumber = Math.floor((columnNumber - 1) / 26);
  }

  return column;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
