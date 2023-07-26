function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Clickup Special')
    .addItem('Fetch Clickup Time Entries', 'openSidebar')
    .addToUi();
}

function openSidebar() {
  var ui = SpreadsheetApp.getUi();
  // Get saved properties
  var scriptProperties = PropertiesService.getScriptProperties();
  var token = scriptProperties.getProperty('token');
  // If not already set, ask user for token and dates
  if (!token) {
    var tokenPrompt = ui.prompt('Please enter your ClickUp token.');
    token = tokenPrompt.getResponseText();
    scriptProperties.setProperty('token', token);
  }
  
  var html = HtmlService.createHtmlOutputFromFile('sidebar.html')
      .setTitle('Fetch Clickup Time Entries')
      .setWidth(400);
      
  SpreadsheetApp.getUi().showSidebar(html);
  
}

function getTeams() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var token = scriptProperties.getProperty('token')
  var url = "https://api.clickup.com/api/v2/team";
  var params = {
    headers: {
      "Authorization": token
    }
  }
  var response = UrlFetchApp.fetch(url, params);
  var teams = JSON.parse(response.getContentText()).teams;
  console.log(teams)
  return teams;
}


function fetchData(team, startDateTime, endDateTime, sheetName) {
  // Convert dates to millisecond timestamps
  var startDateTimestamp = Date.parse(startDateTime);
  var endDateTimestamp = Date.parse(endDateTime);

  // Fetch data from ClickUp
  var url = `https://api.clickup.com/api/v2/team/${team}/time_entries?start_date=${startDateTimestamp}&end_date=${endDateTimestamp}`;
  var token = PropertiesService.getScriptProperties().getProperty('token');
  var params = {
    headers: {
      "Authorization": token
    }
  }
  var response = UrlFetchApp.fetch(url, params);
  var data = JSON.parse(response.getContentText()).data;

  // Flatten the data and gather all keys for the header
  var flatData = data.map(function(entry) {
    return flattenJSON(entry);
  });

  var allKeys = Object.keys(flatData.reduce(function(result, obj) {
    return Object.assign(result, obj);
  }, {}));

  // Create new sheet and write data
  if(sheetName === '' || sheetName === null) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  } else {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    }
  }

  // Prepare headers and data for writing to sheet
  var headers = allKeys;
  var rows = flatData.map(function(entry) {
    return headers.map(function(key) {
      return entry[key] || '';
    });
  });

  // Write headers and data to sheet
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

// Function to flatten a nested JSON object
function flattenJSON(data, prefix = '', result = {}) {
  Object.keys(data).forEach(function(key) {
    var value = data[key];
    var newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      flattenJSON(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  });
  return result;
}
