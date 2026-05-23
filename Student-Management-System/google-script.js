// Google Apps Script for Student Management System
// Copy this code to your Google Apps Script editor

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Student Management System')
    .addItem('Get Web App URL', 'getWebAppUrl')
    .addItem('Setup Spreadsheet', 'setupSpreadsheet')
    .addSeparator()
    .addItem('Test Connection', 'testConnection')
    .addToUi();
}

function getWebAppUrl() {
  const scriptId = ScriptApp.getScriptId();
  const url = `https://script.google.com/macros/s/${scriptId}/exec`;
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Web App URL',
    'Copy this URL for your application:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() == ui.Button.OK) {
    ui.alert('URL copied to clipboard! Paste this in your application setup.');
    // Copy to clipboard (works in most browsers)
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
  
  return url;
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Student Management System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function doPost(e) {
  const action = e.parameter.action;
  
  // Ensure spreadsheet exists
  ensureSpreadsheet();
  
  try {
    switch(action) {
      case 'getStudents':
        return getStudents();
      case 'addStudent':
        return addStudent(JSON.parse(e.parameter.student));
      case 'updateStudent':
        return updateStudent(JSON.parse(e.parameter.student));
      case 'deleteStudent':
        return deleteStudent(e.parameter.studentId);
      case 'addPayment':
        return addPayment(e.parameter.studentId, JSON.parse(e.parameter.payment));
      case 'getDeskCharge':
        return getDeskCharge();
      case 'updateDeskCharge':
        return updateDeskCharge(parseInt(e.parameter.charge));
      default:
        return createResponse('error', 'Unknown action');
    }
  } catch(error) {
    return createResponse('error', error.message);
  }
}

function getSpreadsheet() {
  let spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  
  if (!spreadsheetId) {
    // Create new spreadsheet automatically
    const spreadsheet = SpreadsheetApp.create('Student Management System Data');
    spreadsheetId = spreadsheet.getId();
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
    
    // Set up the spreadsheet structure
    setupSpreadsheetStructure(spreadsheet);
  }
  
  return SpreadsheetApp.openById(spreadsheetId);
}

function ensureSpreadsheet() {
  getSpreadsheet(); // This will create the spreadsheet if it doesn't exist
}

function setupSpreadsheetStructure(spreadsheet) {
  // Create Students sheet
  let studentsSheet = spreadsheet.getSheetByName('Students');
  if (!studentsSheet) {
    studentsSheet = spreadsheet.insertSheet('Students');
  }
  
  const studentHeaders = [
    'id', 'name', 'contact', 'email', 'address', 'fieldOfStudy', 
    'deskNumber', 'registrationDate', 'payments'
  ];
  
  // Clear existing content and set headers
  studentsSheet.clear();
  studentsSheet.getRange(1, 1, 1, studentHeaders.length).setValues([studentHeaders]);
  studentsSheet.getRange('A1:I1').setFontWeight('bold');
  
  // Create Settings sheet
  let settingsSheet = spreadsheet.getSheetByName('Settings');
  if (!settingsSheet) {
    settingsSheet = spreadsheet.insertSheet('Settings');
  }
  
  const settingHeaders = ['deskCharge'];
  settingsSheet.clear();
  settingsSheet.getRange(1, 1, 1, settingHeaders.length).setValues([settingHeaders]);
  settingsSheet.getRange('A1').setFontWeight('bold');
  settingsSheet.getRange('A2').setValue(500);
  
  return spreadsheet;
}

function getStudents() {
  const sheet = getSpreadsheet().getSheetByName('Students');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const students = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { // Skip empty rows
      const student = {};
      headers.forEach((header, index) => {
        student[header] = data[i][index];
      });
      // Parse payments from JSON string
      if (student.payments) {
        student.payments = JSON.parse(student.payments);
      }
      students.push(student);
    }
  }
  
  return createResponse('success', students);
}

function addStudent(studentData) {
  const sheet = getSpreadsheet().getSheetByName('Students');
  
  // Check if desk is already taken
  const data = sheet.getDataRange().getValues();
  const deskColumnIndex = data[0].indexOf('deskNumber');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][deskColumnIndex] === studentData.deskNumber) {
      return createResponse('error', 'Desk number is already taken');
    }
  }
  
  // Add new student
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => studentData[header] || '');
  
  // Convert payments array to JSON string
  const paymentsIndex = headers.indexOf('payments');
  if (paymentsIndex !== -1 && studentData.payments) {
    row[paymentsIndex] = JSON.stringify(studentData.payments);
  }
  
  sheet.appendRow(row);
  
  return createResponse('success', 'Student added successfully');
}

function updateStudent(studentData) {
  const sheet = getSpreadsheet().getSheetByName('Students');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const idIndex = headers.indexOf('id');
  const studentIndex = data.findIndex(row => row[idIndex] === studentData.id);
  
  if (studentIndex === -1) {
    return createResponse('error', 'Student not found');
  }
  
  // Update student data
  headers.forEach((header, index) => {
    if (studentData[header] !== undefined) {
      if (header === 'payments' && Array.isArray(studentData[header])) {
        data[studentIndex][index] = JSON.stringify(studentData[header]);
      } else {
        data[studentIndex][index] = studentData[header];
      }
    }
  });
  
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  
  return createResponse('success', 'Student updated successfully');
}

function deleteStudent(studentId) {
  const sheet = getSpreadsheet().getSheetByName('Students');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const idIndex = headers.indexOf('id');
  const studentIndex = data.findIndex(row => row[idIndex] === studentId);
  
  if (studentIndex === -1) {
    return createResponse('error', 'Student not found');
  }
  
  sheet.deleteRow(studentIndex + 1);
  
  return createResponse('success', 'Student deleted successfully');
}

function addPayment(studentId, paymentData) {
  const sheet = getSpreadsheet().getSheetByName('Students');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const idIndex = headers.indexOf('id');
  const paymentsIndex = headers.indexOf('payments');
  const studentIndex = data.findIndex(row => row[idIndex] === studentId);
  
  if (studentIndex === -1) {
    return createResponse('error', 'Student not found');
  }
  
  // Get existing payments
  let payments = [];
  if (data[studentIndex][paymentsIndex]) {
    payments = JSON.parse(data[studentIndex][paymentsIndex]);
  }
  
  // Add new payment
  payments.push(paymentData);
  
  // Update the row
  data[studentIndex][paymentsIndex] = JSON.stringify(payments);
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  
  return createResponse('success', 'Payment added successfully');
}

function getDeskCharge() {
  const sheet = getSpreadsheet().getSheetByName('Settings');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const chargeIndex = headers.indexOf('deskCharge');
  const chargeRow = data.find(row => row[chargeIndex] !== undefined);
  
  const charge = chargeRow ? chargeRow[chargeIndex] : 500;
  
  return createResponse('success', charge);
}

function updateDeskCharge(charge) {
  const sheet = getSpreadsheet().getSheetByName('Settings');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const chargeIndex = headers.indexOf('deskCharge');
  const chargeRow = data.findIndex(row => row[chargeIndex] !== undefined);
  
  if (chargeRow !== -1) {
    data[chargeRow][chargeIndex] = charge;
  } else {
    data.push([charge]);
  }
  
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  
  return createResponse('success', 'Desk charge updated successfully');
}

function createResponse(status, data) {
  return ContentService.createTextOutput(JSON.stringify({
    status: status,
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

function testConnection() {
  try {
    const spreadsheet = getSpreadsheet();
    const students = [];
    const deskCharge = 500;
    
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '✅ Connection Test Successful!\n\n' +
      'Spreadsheet: ' + spreadsheet.getName() + '\n' +
      'Students: ' + students.length + '\n' +
      'Desk Charge: ₹' + deskCharge + '\n\n' +
      'Your Google Apps Script is working correctly!'
    );
  } catch(error) {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Connection Test Failed!\n\n' +
      'Error: ' + error.message + '\n\n' +
      'Please check your setup and try again.'
    );
  }
}

function setupSpreadsheet() {
  // Create new spreadsheet
  const spreadsheet = SpreadsheetApp.create('Student Management System Data');
  const spreadsheetId = spreadsheet.getId();
  
  // Store spreadsheet ID in script properties
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
  
  // Set up the spreadsheet structure
  setupSpreadsheetStructure(spreadsheet);
  
  // Share settings (optional - make it viewable to anyone with link)
  spreadsheet.share(DriveApp.getRootFolder(), DriveApp.Permission.VIEW);
  
  return `Spreadsheet created successfully! ID: ${spreadsheetId}`;
}
