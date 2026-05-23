# Quick Fix for Spreadsheet ID Error

## Problem
You're seeing: "Failed to connect to Google Sheets: Spreadsheet ID not set. Please set it in script properties."

## Solution ✅

### Option 1: Automatic Fix (Recommended)

1. **Update Your Google Apps Script**
   - Go to your Google Apps Script project
   - Replace all existing code with the updated `google-script.js` content
   - Save the project (Ctrl+S)

2. **Redeploy the Web App**
   - Click "Deploy" → "Manage deployments"
   - Click the pencil icon next to your existing deployment
   - Click "Save" then "Deploy"
   - This will update your Web App URL

3. **Test the Connection**
   - Go back to your Student Management System
   - Try connecting again with the same Web App URL
   - It should now automatically create the spreadsheet

### Option 2: Manual Setup

If automatic fix doesn't work, manually set up the spreadsheet:

1. **Run Setup Function**
   - In Google Apps Script editor
   - Select `setupSpreadsheet` from the function dropdown
   - Click "Run"
   - This will create and configure the spreadsheet

2. **Update Web App**
   - Redeploy your Web App (same steps as Option 1)

## What Changed

The updated code now:
- Automatically creates a Google Sheet if one doesn't exist
- Sets up the proper structure (Students and Settings sheets)
- Stores the Spreadsheet ID automatically
- No manual configuration required

## Verification

After fixing:
1. Check your Google Drive for "Student Management System Data"
2. It should have two sheets: "Students" and "Settings"
3. Your web app should connect without errors

## Still Having Issues?

1. Make sure you copied the entire updated `google-script.js` code
2. Ensure you redeployed the Web App after updating
3. Check that you're using the updated Web App URL
4. Try refreshing your browser and reconnecting

The system should now work automatically without any manual spreadsheet setup!
