const SHEET_ORDERS = "Orders";
const SHEET_CORP = "Corporate_Leads";

function doGet(e) { return handleResponse(e); }
function doPost(e) { return handleResponse(e); }

function handleResponse(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const action = e.parameter.action;

    // ===========================
    // 1. GET ALL DATA (READ)
    // ===========================
    if (action === "getAllData") {
      const sheetOrders = doc.getSheetByName(SHEET_ORDERS);
      const sheetCorp = doc.getSheetByName(SHEET_CORP);
      let b2cData = [], b2bData = [];

      // AMBIL B2C
      if (sheetOrders) {
        const rows = sheetOrders.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          b2cData.push({
            id: rows[i][0],
            name: rows[i][1],
            phone: rows[i][2],
            service: rows[i][3],
            package: rows[i][4],
            status: rows[i][5],
            timestamp: new Date(rows[i][6]).toLocaleString("id-ID"),
            locationLink: rows[i][7], 
            address: rows[i][8]       
          });
        }
      }

      // AMBIL B2B
      if (sheetCorp) {
        const rows = sheetCorp.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          b2bData.push({
            id: rows[i][0], company: rows[i][1], pic: rows[i][2],
            email: rows[i][3], phone: rows[i][4], industry: rows[i][5],
            weight: rows[i][6], package: rows[i][7], address: rows[i][8],
            message: rows[i][9], status: rows[i][10],
            timestamp: new Date(rows[i][11]).toLocaleString("id-ID")
          });
        }
      }

      b2cData.reverse(); 
      b2bData.reverse();
      
      return ContentService.createTextOutput(JSON.stringify({ b2c: b2cData, b2b: b2bData }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ===========================
    // 2. DELETE ORDER
    // ===========================
    if (action === "deleteOrder") {
      const id = e.parameter.id;
      const type = e.parameter.type;
      const sheet = type === "B2C" ? doc.getSheetByName(SHEET_ORDERS) : doc.getSheetByName(SHEET_CORP);
      
      if(sheet) {
        const data = sheet.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
          if(String(data[i][0]) === String(id)) {
            sheet.deleteRow(i + 1); 
            return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ result: "error" })).setMimeType(ContentService.MimeType.JSON);
    }

    // ===========================
    // 3. UPDATE DATA (EDIT FORM)
    // ===========================
    if (action === "updateData") {
      const params = JSON.parse(e.postData.contents);
      const id = params.id;
      const type = params.type;
      const sheet = type === "B2C" ? doc.getSheetByName(SHEET_ORDERS) : doc.getSheetByName(SHEET_CORP);

      if(sheet) {
        const data = sheet.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
          if(String(data[i][0]) === String(id)) {
            const rowIdx = i + 1;
            const formattedPhone = formatToIndoPhone(params.phone);

            if (type === "B2C") {
              sheet.getRange(rowIdx, 2).setValue(params.name);     
              sheet.getRange(rowIdx, 3).setValue(formattedPhone);    
              sheet.getRange(rowIdx, 4).setValue(params.service);  
              sheet.getRange(rowIdx, 5).setValue(params.package);  
              sheet.getRange(rowIdx, 6).setValue(params.status);   
              sheet.getRange(rowIdx, 8).setValue(params.email);    
              sheet.getRange(rowIdx, 9).setValue(params.address);  
            } else {
              sheet.getRange(rowIdx, 2).setValue(params.company);
              sheet.getRange(rowIdx, 3).setValue(params.pic);
              sheet.getRange(rowIdx, 4).setValue(params.email);
              sheet.getRange(rowIdx, 5).setValue(formattedPhone);
              sheet.getRange(rowIdx, 6).setValue(params.industry);
              sheet.getRange(rowIdx, 7).setValue(params.weight);
              sheet.getRange(rowIdx, 8).setValue(params.package);
              sheet.getRange(rowIdx, 9).setValue(params.address);
              sheet.getRange(rowIdx, 10).setValue(params.message);
              sheet.getRange(rowIdx, 11).setValue(params.status);
            }
            return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ result: "error" })).setMimeType(ContentService.MimeType.JSON);
    }

    // ===========================
    // 4. UPDATE STATUS (QUICK)
    // ===========================
    if (action === "updateStatus") {
        const id = e.parameter.id;
        const newStatus = e.parameter.status;
        const type = e.parameter.type;
        const sheet = type === "B2C" ? doc.getSheetByName(SHEET_ORDERS) : doc.getSheetByName(SHEET_CORP);
        const colIdx = type === "B2C" ? 6 : 11;
        
        if (sheet) {
            const data = sheet.getDataRange().getValues();
            for (let i = 1; i < data.length; i++) {
                if (String(data[i][0]) === String(id)) {
                    sheet.getRange(i + 1, colIdx).setValue(newStatus);
                    return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
                }
            }
        }
        return ContentService.createTextOutput(JSON.stringify({ result: "error" })).setMimeType(ContentService.MimeType.JSON);
    }

    // ===========================
    // 5. INPUT ORDER BARU (CREATE)
    // ===========================
    if (e.postData && !e.parameter.action) {
        const params = JSON.parse(e.postData.contents);
        const timestamp = new Date();
        const formattedPhone = formatToIndoPhone(params.phone);
        
        if (params.type === 'B2B') {
            const sheet = doc.getSheetByName(SHEET_CORP);
            const uniqueID = 'CORP-' + Date.now();
            const initialStatus = "Menunggu Konfirmasi";
            
            sheet.appendRow([
                uniqueID, 
                params.company, 
                params.pic, 
                params.email, 
                formattedPhone,
                params.industry, 
                params.weight, 
                params.corpPackage, 
                params.address, 
                params.message, 
                initialStatus, 
                timestamp
            ]);
            
            return ContentService.createTextOutput(JSON.stringify({ result: "success", orderID: uniqueID })).setMimeType(ContentService.MimeType.JSON);

        } else {
            // B2C ORDER
            const sheet = doc.getSheetByName(SHEET_ORDERS);
            const uniqueID = 'CO-' + Date.now();
            const defaultStatus = "Menunggu Konfirmasi";
            
            // PERBAIKAN PENTING: Menerima params.locationLink atau strip jika kosong
            const locLink = params.locationLink ? params.locationLink : "-";

            sheet.appendRow([
                uniqueID, 
                params.name, 
                formattedPhone,
                params.service, 
                params.package, 
                defaultStatus, 
                timestamp, 
                locLink, // Masukkan Link Lokasi di sini
                params.address
            ]);
            return ContentService.createTextOutput(JSON.stringify({ result: "success", orderID: uniqueID })).setMimeType(ContentService.MimeType.JSON);
        }
    }

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// HELPER: Format HP
function formatToIndoPhone(phoneInput) {
  let p = String(phoneInput).trim();
  if (p.startsWith('0')) {
     p = '62' + p.substring(1);
  }
  return "'" + p;
}