# Google Apps Script Setup Fix

## Problem Solved ✅

**Error:** `Exception: No HTML file named Index was found.`

**Solution:** Changed `HtmlService.createHtmlOutputFromFile('Index')` to `HtmlService.createHtmlOutputFromFile('index')`

## Updated Google Apps Script Setup Instructions

### Step 1: Create Google Apps Script Project
1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Delete any existing code in the editor

### Step 2: Add HTML File
1. In the Google Apps Script editor, click the "+" icon next to "Files"
2. Select "HTML"
3. Name the file `index.html` (exactly this name - lowercase)
4. Copy the entire content from your `index-new.html` file
5. Paste it into the HTML file and save

### Step 3: Add JavaScript File
1. The main file should be named `Code.gs` (or similar)
2. Copy the entire content from the updated `google-script.js` file
3. Paste it into the Code.gs file and save

### Step 4: Deploy as Web App
1. Click "Deploy" → "New deployment"
2. Select "Web app" as type
3. Configure:
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
4. Click "Deploy"
5. **Authorize** the permissions when prompted
6. Copy the **Web app URL** that appears

### Step 5: Connect Your Application
1. Open your `index-new.html` in browser
2. When setup modal appears, paste the Web app URL
3. Click "Connect to Google Sheets"

## File Structure in Google Apps Script

Your Google Apps Script project should have:

```
📁 Project Name
├── 📄 index.html (your HTML content)
├── 📄 Code.gs (your JavaScript content)
└── 📄 appsscript.json (auto-generated)
```

## Important Notes

- **File names are case-sensitive**: `index.html` not `Index.html`
- **HTML file must be named exactly `index.html`**
- **Make sure to save both files after pasting content**
- **Redeploy after making changes to files**

## Alternative: Single File Method

If you prefer using a single file, you can also modify the `doGet` function to return HTML directly:

```javascript
function doGet(e) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Student Management System</title>
      <!-- Your CSS and meta tags here -->
    </head>
    <body>
      <!-- Your HTML content here -->
      <script>
        // Your JavaScript here
      </script>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(html)
    .setTitle('Student Management System');
}
```

But the separate file method is recommended for better organization.

The fix has been applied to your `google-script.js` file. Now use the updated code and follow the instructions above!
