// If this script is bound to your Google Sheet, leave SPREADSHEET_ID blank.
// If it is a standalone Apps Script project, paste the Sheet ID here.
const SPREADSHEET_ID = '1970xg3EdpP5wV2beiaYvR-MzhD2g-vlMohATbA5GyK0';
const SHEET_NAME = 'S3 GYM LEADS';
const ADMIN_EMAIL = 'kaushiktanmay332@gmail.com';
const CRM_HEADERS = [
  'Received At',
  'Name',
  'Phone',
  'WhatsApp',
  'Email',
  'Plan',
  'Goal',
  'Status',
  'Priority',
  'Follow Up Done',
  'Notes',
  'Message',
  'Source',
  'Membership Value',
  'Subject',
  'ID',
  'Type',
  'Created At'
];

function doPost(e) {
  const sheet = getSheet();
  const data = JSON.parse(e.postData.contents);

  ensureHeaders(sheet);
  appendCrmRow(sheet, data);

  sendNotificationEmail(data);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendNotificationEmail(data) {
  const subject = `🔥 New Gym Lead: ${data.name || 'Unknown Lead'}`;

  const whatsapp = data.phone
    ? `https://wa.me/91${String(data.phone).replace(/\D/g, '')}`
    : 'N/A';

  const body = `
🏋️ New Lead Received

Name: ${data.name || '-'}
Phone: ${data.phone || '-'}
Email: ${data.email || '-'}
Plan: ${data.plan || '-'}
Goal: ${data.goal || '-'}

WhatsApp:
${whatsapp}

CRM:
https://docs.google.com/spreadsheets/d/1970xg3EdpP5wV2beiaYvR-MzhD2g-vlMohATbA5GyK0/edit
`;

  MailApp.sendEmail(
    "kaushiktanmay332@gmail.com",
    subject,
    body
  );
}

function getSheet() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('No spreadsheet found. Open Apps Script from the Sheet, or set SPREADSHEET_ID.');
  }

  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;

  sheet.appendRow(CRM_HEADERS);
}

function appendCrmRow(sheet, data) {
  const headers = getHeaders(sheet);
  const rowNumber = sheet.getLastRow() + 1;
  const row = headers.map((header) => getColumnValue(header, data, rowNumber, headers));

  sheet.appendRow(row);
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
  const receivedAtColumn = getA1Column(headers.indexOf('Received At') + 1);

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
    case 'Notes':
      return '';
    case 'Message':
      return data.message || '';
    case 'Source':
      return data.source || getDefaultSource();
    case 'Membership Value':
      return Number(data.membershipValue || data.planPrice || 0) || '';
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



// *************************************** TESTING ****************************
function testSheetInfo() {
  const sheet = getSheet();

  Logger.log("Sheet Name: " + sheet.getName());
  Logger.log("Rows: " + sheet.getLastRow());
  Logger.log("Columns: " + sheet.getLastColumn());
}

function testInsert() {
  const sheet = getSheet();

  sheet.appendRow([
    new Date(),
    "TEST USER",
    "9999999999"
  ]);
}

function authorizeEmail() {
  MailApp.sendEmail(
    "kaushiktanmay332@gmail.com",
    "Test Email",
    "Email notifications are working."
  );
}


