// If this script is bound to your Google Sheet, leave SPREADSHEET_ID blank.
// If it is a standalone Apps Script project, paste the Sheet ID here.
const SPREADSHEET_ID = '';
const SHEET_NAME = 'Submissions';
const ADMIN_EMAIL = 'kaushiktanmay332@gmail.com';

function doPost(e) {
  const sheet = getSheet();
  const data = JSON.parse(e.postData.contents);

  ensureHeaders(sheet);

  sheet.appendRow([
    new Date(),
    data.type || '',
    data.id || '',
    data.name || '',
    data.phone || '',
    data.email || '',
    data.planId || '',
    data.goal || '',
    data.subject || '',
    data.message || '',
    data.status || '',
    data.createdAt || ''
  ]);

  sendNotificationEmail(data);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendNotificationEmail(data) {
  const recipient = data.notificationEmail || ADMIN_EMAIL;
  if (!recipient) return;

  const submissionType = data.type === 'contact' ? 'Contact form' : 'Free trial form';
  const subject = `New ${submissionType} submission - ${data.name || 'S3 Fitness'}`;
  const body = [
    `New ${submissionType} submission`,
    '',
    `Name: ${data.name || '-'}`,
    `Phone: ${data.phone || '-'}`,
    `Email: ${data.email || '-'}`,
    `Plan: ${data.planId || '-'}`,
    `Goal: ${data.goal || '-'}`,
    `Subject: ${data.subject || '-'}`,
    `Message: ${data.message || '-'}`,
    `Status: ${data.status || '-'}`,
    `Created At: ${data.createdAt || new Date().toISOString()}`
  ].join('\n');

  MailApp.sendEmail({
    to: recipient,
    subject,
    body
  });
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

  sheet.appendRow([
    'Received At',
    'Type',
    'ID',
    'Name',
    'Phone',
    'Email',
    'Plan ID',
    'Goal',
    'Subject',
    'Message',
    'Status',
    'Created At'
  ]);
}
