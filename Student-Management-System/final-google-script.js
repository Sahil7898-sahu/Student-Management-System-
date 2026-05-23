// Complete Google Apps Script for Student Management System
// Error-free version with proper data handling

// Global variables
var SPREADSHEET_ID = '';
var SHEET_NAME = 'Students';
var SETTINGS_SHEET = 'Settings';

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Student Management System')
      .addItem('Get Web App URL', 'getWebAppUrl')
      .addItem('Setup Spreadsheet', 'setupSpreadsheet')
      .addItem('Test Connection', 'testConnection')
      .addSeparator()
      .addItem('Clear All Data', 'clearAllData')
      .addToUi();
  } catch(e) {
    Logger.log('Error in onOpen: ' + e.toString());
  }
}

function getWebAppUrl() {
  try {
    var scriptId = ScriptApp.getScriptId();
    var url = 'https://script.google.com/macros/s/' + scriptId + '/exec';
    
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt(
      'Web App URL',
      'Copy this URL for your application:\n\n' + url,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() == ui.Button.OK) {
      ui.alert('URL Ready!\n\nCopy this URL and paste it in your application:\n\n' + url);
    }
    
    return url;
  } catch(e) {
    Logger.log('Error getting Web App URL: ' + e.toString());
    return 'Error: ' + e.toString();
  }
}

function doGet(e) {
  try {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Student Management System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  } catch(e) {
    return HtmlService.createHtmlOutput(
      '<h1>Error Loading Application</h1><p>' + e.toString() + '</p>'
    );
  }
}

function doPost(e) {
  try {
    var action = e.parameter.action;
    var result = {status: 'success', data: null};
    
    // Ensure spreadsheet exists
    ensureSpreadsheet();
    
    switch(action) {
      case 'getStudents':
        result.data = getStudents();
        break;
      case 'addStudent':
        var studentData = JSON.parse(e.parameter.student);
        result.data = addStudent(studentData);
        break;
      case 'updateStudent':
        var studentData = JSON.parse(e.parameter.student);
        result.data = updateStudent(studentData);
        break;
      case 'deleteStudent':
        var studentId = e.parameter.studentId;
        result.data = deleteStudent(studentId);
        break;
      case 'addPayment':
        var studentId = e.parameter.studentId;
        var paymentData = JSON.parse(e.parameter.payment);
        result.data = addPayment(studentId, paymentData);
        break;
      case 'getDeskCharge':
        result.data = getDeskCharge();
        break;
      case 'updateDeskCharge':
        var charge = parseInt(e.parameter.charge);
        result.data = updateDeskCharge(charge);
        break;
      default:
        result.status = 'error';
        result.data = 'Unknown action: ' + action;
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(e) {
    Logger.log('Error in doPost: ' + e.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      data: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureSpreadsheet() {
  try {
    var scriptProperties = PropertiesService.getScriptProperties();
    SPREADSHEET_ID = scriptProperties.getProperty('SPREADSHEET_ID');
    
    if (!SPREADSHEET_ID) {
      // Create new spreadsheet
      var spreadsheet = SpreadsheetApp.create('Student Management System Data');
      SPREADSHEET_ID = spreadsheet.getId();
      scriptProperties.setProperty('SPREADSHEET_ID', SPREADSHEET_ID);
      
      // Setup structure
      setupSpreadsheetStructure(spreadsheet);
      
      Logger.log('Created new spreadsheet with ID: ' + SPREADSHEET_ID);
    }
    
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch(e) {
    Logger.log('Error ensuring spreadsheet: ' + e.toString());
    throw e;
  }
}

function setupSpreadsheetStructure(spreadsheet) {
  try {
    // Create Students sheet
    var studentsSheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!studentsSheet) {
      studentsSheet = spreadsheet.insertSheet(SHEET_NAME);
    }
    
    // Set headers
    var headers = ['id', 'name', 'contact', 'email', 'address', 'fieldOfStudy', 'deskNumber', 'registrationDate', 'payments'];
    studentsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    studentsSheet.getRange('A1:I1').setFontWeight('bold');
    studentsSheet.autoResizeColumn(1, 9);
    
    // Create Settings sheet
    var settingsSheet = spreadsheet.getSheetByName(SETTINGS_SHEET);
    if (!settingsSheet) {
      settingsSheet = spreadsheet.insertSheet(SETTINGS_SHEET);
    }
    
    var settingHeaders = ['deskCharge'];
    settingsSheet.getRange(1, 1, 1, settingHeaders.length).setValues([settingHeaders]);
    settingsSheet.getRange('A1').setFontWeight('bold');
    settingsSheet.getRange('A2').setValue(500);
    
    Logger.log('Spreadsheet structure setup completed');
  } catch(e) {
    Logger.log('Error setting up spreadsheet structure: ' + e.toString());
    throw e;
  }
}

function getStudents() {
  try {
    var spreadsheet = ensureSpreadsheet();
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var students = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() !== '') {
        var student = {};
        for (var j = 0; j < headers.length; j++) {
          student[headers[j]] = data[i][j] || '';
        }
        
        // Parse payments
        if (student.payments && student.payments !== '') {
          try {
            student.payments = JSON.parse(student.payments);
          } catch(e) {
            student.payments = [];
          }
        } else {
          student.payments = [];
        }
        
        students.push(student);
      }
    }
    
    Logger.log('Retrieved ' + students.length + ' students');
    return students;
  } catch(e) {
    Logger.log('Error getting students: ' + e.toString());
    throw e;
  }
}

function addStudent(studentData) {
  try {
    var spreadsheet = ensureSpreadsheet();
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Check if desk is already taken
    var data = sheet.getDataRange().getValues();
    var deskColumnIndex = 6; // deskNumber column
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][deskColumnIndex] && data[i][deskColumnIndex].toString() === studentData.deskNumber) {
        throw new Error('Desk number ' + studentData.deskNumber + ' is already taken');
      }
    }
    
    // Add new student
    var headers = ['id', 'name', 'contact', 'email', 'address', 'fieldOfStudy', 'deskNumber', 'registrationDate', 'payments'];
    var row = headers.map(function(header) {
      return studentData[header] || '';
    });
    
    // Convert payments to JSON string
    var paymentsIndex = 7; // payments column
    if (studentData.payments && Array.isArray(studentData.payments)) {
      row[paymentsIndex] = JSON.stringify(studentData.payments);
    }
    
    sheet.appendRow(row);
    
    Logger.log('Added student: ' + studentData.name);
    return 'Student added successfully';
  } catch(e) {
    Logger.log('Error adding student: ' + e.toString());
    throw e;
  }
}

function updateStudent(studentData) {
  try {
    var spreadsheet = ensureSpreadsheet();
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    
    var idIndex = 0; // id column
    var studentIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][idIndex] && data[i][idIndex].toString() === studentData.id) {
        studentIndex = i;
        break;
      }
    }
    
    if (studentIndex === -1) {
      throw new Error('Student not found');
    }
    
    // Update student data
    var headers = ['id', 'name', 'contact', 'email', 'address', 'fieldOfStudy', 'deskNumber', 'registrationDate', 'payments'];
    for (var j = 0; j < headers.length; j++) {
      if (studentData[headers[j]] !== undefined) {
        if (headers[j] === 'payments' && Array.isArray(studentData[headers[j]])) {
          data[studentIndex][j] = JSON.stringify(studentData[headers[j]]);
        } else {
          data[studentIndex][j] = studentData[headers[j]];
        }
      }
    }
    
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    Logger.log('Updated student: ' + studentData.name);
    return 'Student updated successfully';
  } catch(e) {
    Logger.log('Error updating student: ' + e.toString());
    throw e;
  }
}

function deleteStudent(studentId) {
  try {
    var spreadsheet = ensureSpreadsheet();
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    
    var idIndex = 0; // id column
    var studentIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][idIndex] && data[i][idIndex].toString() === studentId) {
        studentIndex = i;
        break;
      }
    }
    
    if (studentIndex === -1) {
      throw new Error('Student not found');
    }
    
    sheet.deleteRow(studentIndex + 1);
    
    Logger.log('Deleted student with ID: ' + studentId);
    return 'Student deleted successfully';
  } catch(e) {
    Logger.log('Error deleting student: ' + e.toString());
    throw e;
  }
}

function addPayment(studentId, paymentData) {
  try {
    var spreadsheet = ensureSpreadsheet();
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    
    var idIndex = 0; // id column
    var paymentsIndex = 7; // payments column
    var studentIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][idIndex] && data[i][idIndex].toString() === studentId) {
        studentIndex = i;
        break;
      }
    }
    
    if (studentIndex === -1) {
      throw new Error('Student not found');
    }
    
    // Get existing payments
    var payments = [];
    if (data[studentIndex][paymentsIndex] && data[studentIndex][paymentsIndex] !== '') {
      try {
        payments = JSON.parse(data[studentIndex][paymentsIndex]);
      } catch(e) {
        payments = [];
      }
    }
    
    // Add new payment
    payments.push(paymentData);
    
    // Update the row
    data[studentIndex][paymentsIndex] = JSON.stringify(payments);
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    Logger.log('Added payment for student ID: ' + studentId);
    return 'Payment added successfully';
  } catch(e) {
    Logger.log('Error adding payment: ' + e.toString());
    throw e;
  }
}

function getDeskCharge() {
  try {
    var spreadsheet = ensureSpreadsheet();
    var sheet = spreadsheet.getSheetByName(SETTINGS_SHEET);
    var data = sheet.getDataRange().getValues();
    
    var chargeIndex = 0; // deskCharge column
    var charge = 500; // default
    
    if (data.length > 1 && data[1][chargeIndex]) {
      charge = parseInt(data[1][chargeIndex]);
    }
    
    Logger.log('Retrieved desk charge: ' + charge);
    return charge;
  } catch(e) {
    Logger.log('Error getting desk charge: ' + e.toString());
    return 500; // default value
  }
}

function updateDeskCharge(charge) {
  try {
    var spreadsheet = ensureSpreadsheet();
    var sheet = spreadsheet.getSheetByName(SETTINGS_SHEET);
    
    sheet.getRange('A2').setValue(charge);
    
    Logger.log('Updated desk charge to: ' + charge);
    return 'Desk charge updated successfully';
  } catch(e) {
    Logger.log('Error updating desk charge: ' + e.toString());
    throw e;
  }
}

function testConnection() {
  try {
    var spreadsheet = ensureSpreadsheet();
    var students = getStudents();
    var deskCharge = getDeskCharge();
    
    var ui = SpreadsheetApp.getUi();
    ui.alert(
      '✅ Connection Test Successful!\n\n' +
      'Spreadsheet: ' + spreadsheet.getName() + '\n' +
      'Students: ' + students.length + '\n' +
      'Desk Charge: ₹' + deskCharge + '\n\n' +
      'Your Google Apps Script is working correctly!'
    );
  } catch(e) {
    var ui = SpreadsheetApp.getUi();
    ui.alert(
      '❌ Connection Test Failed!\n\n' +
      'Error: ' + e.toString() + '\n\n' +
      'Please check your setup and try again.'
    );
  }
}

function clearAllData() {
  try {
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt(
      'Clear All Data',
      'Are you sure you want to delete ALL student data? Type "DELETE" to confirm:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() == ui.Button.OK && response.getResponseText() === 'DELETE') {
      var spreadsheet = ensureSpreadsheet();
      var sheet = spreadsheet.getSheetByName(SHEET_NAME);
      
      // Clear all data except headers
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      
      ui.alert('✅ All data cleared successfully!');
    } else {
      ui.alert('Operation cancelled.');
    }
  } catch(e) {
    var ui = SpreadsheetApp.getUi();
    ui.alert('Error clearing data: ' + e.toString());
  }
}

function setupSpreadsheet() {
  try {
    var spreadsheet = ensureSpreadsheet();
    setupSpreadsheetStructure(spreadsheet);
    
    var ui = SpreadsheetApp.getUi();
    ui.alert('✅ Spreadsheet setup completed!\n\nWeb App URL:\n' + getWebAppUrl());
  } catch(e) {
    var ui = SpreadsheetApp.getUi();
    ui.alert('Error setting up spreadsheet: ' + e.toString());
  }
}
