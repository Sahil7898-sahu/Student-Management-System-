# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration for your Student Management System to store all data in the cloud.

## 🚀 Quick Setup Steps

### Step 1: Create Google Apps Script

1. **Go to Google Apps Script**
   - Visit: https://script.google.com
   - Sign in with your Google account

2. **Create New Project**
   - Click on "New Project"
   - Give it a name like "Student Management Backend"

3. **Copy the Backend Code**
   - Open the `google-script.js` file from your project
   - Copy all the content
   - Paste it into the Google Apps Script editor

4. **Save the Project**
   - Press `Ctrl + S` or click the floppy disk icon
   - Give the project a name if prompted

### Step 2: Deploy as Web App

1. **Click Deploy**
   - In the top right, click "Deploy" → "New deployment"

2. **Configure Web App**
   - Click the gear icon ⚙️ next to "Select type"
   - Choose "Web app"
   - Click "Deploy"

3. **Set Permissions**
   - **Execute as**: "Me" (your Google account)
   - **Who has access**: "Anyone" (required for web app to work)
   - Click "Deploy"

4. **Authorization**
   - Click "Authorize access"
   - Choose your Google account
   - You might see "This app isn't verified" - click "Advanced" → "Go to [Project Name] (unsafe)"
   - Click "Allow" for all permissions

5. **Copy Web App URL**
   - After deployment, you'll get a Web app URL
   - Copy this URL - it looks like: `https://script.google.com/macros/s/ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789/exec`

### Step 3: Connect Your Application

1. **Open Your Student Management System**
   - Open `index.html` in your browser
   - You'll see a setup modal asking for Google Sheets connection

2. **Enter Web App URL**
   - Paste the Web app URL you copied
   - Click "Connect to Google Sheets"

3. **Setup Complete!**
   - The system will automatically create a Google Sheet
   - All data will now be stored in Google Sheets

## 📊 Google Sheets Structure

After setup, you'll have a Google Sheet with two tabs:

### Students Sheet
Columns:
- `id` - Unique student identifier
- `name` - Student full name
- `contact` - Phone number
- `email` - Email address
- `address` - Home address
- `fieldOfStudy` - Field of study
- `deskNumber` - Assigned desk number
- `registrationDate` - Registration date
- `payments` - JSON string of payment records

### Settings Sheet
Columns:
- `deskCharge` - Current desk charge amount

## 🔧 Advanced Configuration

### Custom Spreadsheet Setup

If you want to use an existing Google Sheet:

1. **Get Spreadsheet ID**
   - Open your Google Sheet
   - Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the `SPREADSHEET_ID`

2. **Update Script Properties**
   - In Google Apps Script editor
   - Go to "Project Settings" (⚙️)
   - Under "Script Properties", click "Add script property"
   - Property name: `SPREADSHEET_ID`
   - Property value: Your spreadsheet ID

3. **Create Required Sheets**
   - Make sure you have two sheets: "Students" and "Settings"
   - "Students" sheet should have headers: `id`, `name`, `contact`, `email`, `address`, `fieldOfStudy`, `deskNumber`, `registrationDate`, `payments`
   - "Settings" sheet should have header: `deskCharge`

### Running Setup Function

You can run the setup function manually:

1. In Google Apps Script editor
2. Select `setupSpreadsheet` function from the dropdown
3. Click "Run"
4. This will create a new spreadsheet with the required structure

## 🔄 Data Sync Features

### Automatic Sync
- All student registrations sync immediately
- Payment updates sync in real-time
- Desk charge changes sync automatically

### Offline Mode
- If Google Sheets is unavailable, you can switch to local storage
- Click "Use Local Storage (Offline)" in the setup modal
- Data will be stored in browser localStorage

### Data Export
- You can still export data as JSON from the admin panel
- This creates a backup of all your data

## 🛡️ Security Considerations

### Data Privacy
- Your data is stored in your Google Drive
- Only you have access to the Google Sheet
- The web app URL should be kept private

### Sharing Options
- You can share the Google Sheet with other users
- Set appropriate permissions (View/Edit)
- Multiple users can access the same data

## 🚨 Troubleshooting

### Common Issues

**"Failed to connect to Google Sheets"**
- Check that you copied the correct Web app URL
- Ensure the web app is deployed with "Anyone" access
- Try redeploying the web app

**"Permission denied" errors**
- Make sure you authorized all requested permissions
- Check that the script has access to Google Sheets API

**"Spreadsheet ID not set" error**
- Run the `setupSpreadsheet` function
- Or manually set the SPREADSHEET_ID property

**Data not syncing**
- Check your internet connection
- Verify the web app URL is correct
- Try refreshing the page and reconnecting

### Debug Mode

To enable debug logging:
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for error messages during operations

## 📱 Mobile Access

Once set up with Google Sheets:
- Access your data from any device
- Multiple users can use the system simultaneously
- Changes sync across all devices in real-time

## 🔄 Migration from Local Storage

If you have existing data in local storage:

1. **Export your data**
   - Go to Admin Panel → Export Data
   - Save the JSON file

2. **Import to Google Sheets**
   - You can manually import the JSON data
   - Or contact support for migration assistance

## 💡 Tips and Best Practices

1. **Regular Backups**: Periodically export your data as backup
2. **Share Carefully**: Only share Google Sheet access with trusted users
3. **Monitor Usage**: Check your Google Sheet for unusual activity
4. **Test First**: Try with test data before using with real student data

## 🆘 Support

If you encounter issues:

1. Check this guide for common solutions
2. Review the browser console for error messages
3. Ensure all setup steps were completed correctly
4. Try redeploying the Google Apps Script web app

---

**Note**: Google Sheets integration requires an active internet connection and a Google account. Local storage mode is available as a backup option.
