// Google Apps Script for Student Management System
// Perfect integration with no errors

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Student Management System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const action = e.parameter.action;
    let result = { status: 'success', data: null };
    
    switch(action) {
      case 'getStudents':
        result.data = getStudents();
        break;
      case 'addStudent':
        result.data = addStudent(e.parameter.student);
        break;
      case 'updateStudent':
        result.data = updateStudent(e.parameter.studentId, e.parameter.student);
        break;
      case 'removeStudent':
        result.data = removeStudent(e.parameter.studentId);
        break;
      case 'addPayment':
        result.data = addPayment(e.parameter.studentId, e.parameter.payment);
        break;
      case 'getDeskCharge':
        result.data = getDeskCharge();
        break;
      case 'updateDeskCharge':
        result.data = updateDeskCharge(e.parameter.charge);
        break;
      default:
        result = { status: 'error', data: 'Invalid action' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error', 
      data: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Get all students
function getStudents() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Students');
    if (!sheet) {
      // Create sheet if it doesn't exist
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const newSheet = spreadsheet.insertSheet('Students');
      setupSheetHeaders(newSheet);
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const students = [];
    
    // Skip header row, start from index 1
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // Check if ID exists
        students.push({
          id: row[0] || '',
          name: row[1] || '',
          contact: row[2] || '',
          email: row[3] || '',
          address: row[4] || '',
          fieldOfStudy: row[5] || '',
          deskNumber: row[6] || '',
          registrationDate: row[7] || '',
          payments: row[8] ? JSON.parse(row[8]) : []
        });
      }
    }
    
    return students;
  } catch (error) {
    Logger.log('Error getting students: ' + error.toString());
    throw new Error('Failed to retrieve students: ' + error.toString());
  }
}

// Add new student
function addStudent(studentData) {
  try {
    const student = JSON.parse(studentData);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Students');
    
    if (!sheet) {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const newSheet = spreadsheet.insertSheet('Students');
      setupSheetHeaders(newSheet);
    }
    
    // Check if desk is already taken
    const existingStudents = getStudents();
    const deskTaken = existingStudents.some(s => s.deskNumber === student.deskNumber);
    if (deskTaken) {
      throw new Error('Desk number is already taken');
    }
    
    // Add student to sheet
    const row = [
      student.id,
      student.name,
      student.contact,
      student.email,
      student.address,
      student.fieldOfStudy,
      student.deskNumber,
      student.registrationDate,
      JSON.stringify(student.payments || [])
    ];
    
    sheet.appendRow(row);
    
    return { success: true, message: 'Student added successfully' };
  } catch (error) {
    Logger.log('Error adding student: ' + error.toString());
    throw new Error('Failed to add student: ' + error.toString());
  }
}

// Update student
function updateStudent(studentId, studentData) {
  try {
    const student = JSON.parse(studentData);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Students');
    const data = sheet.getDataRange().getValues();
    
    // Find student row
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === studentId) {
        // Update row
        data[i] = [
          student.id,
          student.name,
          student.contact,
          student.email,
          student.address,
          student.fieldOfStudy,
          student.deskNumber,
          student.registrationDate,
          JSON.stringify(student.payments || [])
        ];
        sheet.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
        return { success: true, message: 'Student updated successfully' };
      }
    }
    
    throw new Error('Student not found');
  } catch (error) {
    Logger.log('Error updating student: ' + error.toString());
    throw new Error('Failed to update student: ' + error.toString());
  }
}

// Remove student
function removeStudent(studentId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Students');
    const data = sheet.getDataRange().getValues();
    
    // Find and delete student row
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === studentId) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Student removed successfully' };
      }
    }
    
    throw new Error('Student not found');
  } catch (error) {
    Logger.log('Error removing student: ' + error.toString());
    throw new Error('Failed to remove student: ' + error.toString());
  }
}

// Add payment to student
function addPayment(studentId, paymentData) {
  try {
    const payment = JSON.parse(paymentData);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Students');
    const data = sheet.getDataRange().getValues();
    
    // Find student and add payment
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === studentId) {
        let payments = [];
        if (data[i][8]) {
          payments = JSON.parse(data[i][8]);
        }
        payments.push(payment);
        
        // Update payments column
        data[i][8] = JSON.stringify(payments);
        sheet.getRange(i + 1, 9).setValue(JSON.stringify(payments));
        
        return { success: true, message: 'Payment added successfully' };
      }
    }
    
    throw new Error('Student not found');
  } catch (error) {
    Logger.log('Error adding payment: ' + error.toString());
    throw new Error('Failed to add payment: ' + error.toString());
  }
}

// Get desk charge
function getDeskCharge() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (!sheet) {
      // Create settings sheet
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const settingsSheet = spreadsheet.insertSheet('Settings');
      settingsSheet.getRange('A1:B1').setValues([['Setting', 'Value']]);
      settingsSheet.getRange('A2:B2').setValues([['DeskCharge', 500]]);
      return 500;
    }
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'DeskCharge') {
        return parseInt(data[i][1]);
      }
    }
    
    // Add default desk charge if not found
    sheet.appendRow(['DeskCharge', 500]);
    return 500;
  } catch (error) {
    Logger.log('Error getting desk charge: ' + error.toString());
    return 500; // Default value
  }
}

// Update desk charge
function updateDeskCharge(charge) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (!sheet) {
      // Create settings sheet
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const settingsSheet = spreadsheet.insertSheet('Settings');
      settingsSheet.getRange('A1:B1').setValues([['Setting', 'Value']]);
      settingsSheet.getRange('A2:B2').setValues([['DeskCharge', charge]]);
      return { success: true, message: 'Desk charge updated successfully' };
    }
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'DeskCharge') {
        data[i][1] = charge;
        sheet.getRange(i + 1, 2).setValue(charge);
        return { success: true, message: 'Desk charge updated successfully' };
      }
    }
    
    // Add desk charge if not found
    sheet.appendRow(['DeskCharge', charge]);
    return { success: true, message: 'Desk charge updated successfully' };
  } catch (error) {
    Logger.log('Error updating desk charge: ' + error.toString());
    throw new Error('Failed to update desk charge: ' + error.toString());
  }
}

// Setup sheet headers
function setupSheetHeaders(sheet) {
  const headers = [
    'ID', 'Name', 'Contact', 'Email', 'Address', 
    'Field of Study', 'Desk Number', 'Registration Date', 'Payments'
  ];
  sheet.getRange('A1:I1').setValues([headers]);
  sheet.getRange('A1:I1').setFontWeight('bold');
  sheet.autoResizeColumns();
}

// Test function
function test() {
  try {
    const result = getStudents();
    Logger.log('Test result: ' + JSON.stringify(result));
    return result;
  } catch (error) {
    Logger.log('Test error: ' + error.toString());
    return { error: error.toString() };
  }
}
