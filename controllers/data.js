const xlsx = require('xlsx');
const financeDB = require('../db/exceldb');

// Column Mapping

const columnMapFactInventory = {
  'Created Date': 'Created Date',
  'Status': 'Status',
  'Type': 'Type',
  'PO ID': 'PO ID',
  'Receipt Date': 'Receipt Date',
  'Need By': 'Need By',
  'Order Line Number': 'Order Line Number',
  'Order Date': 'Order Date',
  'Invoice (ASN Line)': 'Invoice ASN Line',
  'Item': 'Item',
  'Item Number': 'Item Number',
  'Invoice Line Number(ASN Line)':'Invoice Line Number(ASN Line)',
  'Supplier': 'Supplier',
  'Receiver': 'Receiver',
  'Payment Term': 'Payment Term',
  'To Warehouse': 'To Warehouse',
  'To Warehouse Location': 'To Warehouse Location',
  'Quantity': 'Quantity',
  'UOM': 'UOM',
  'Price': 'Price',
  'Currency': 'Currency',
  'Total': 'Total'
};

const columnMapSupplyChain = {
  'Created Date': 'Created Date',
  'Status': 'Status',
  'Type': 'Type',
  'PO ID': 'PO ID',
  'Receipt Date': 'Receipt Date',
  'Need By': 'Need By',
  'Order Line Number': 'Order Line Number',
  'Order Date': 'Order Date',
  'Invoice (ASN Line)': 'Invoice ASN Line',
  'Item': 'Item',
  'Item Number': 'Item Number',
  'Invoice Line Number': 'Invoice Line Number',
  'Supplier': 'Supplier',
  'Receiver': 'Receiver',
  'Payment Term': 'Payment Term',
  'To Warehouse': 'To Warehouse',
  'To Warehouse Location': 'To Warehouse Location',
  'Quantity': 'Quantity',
  'UOM': 'UOM',
  'Price': 'Price',
  'Currency': 'Currency',
  'Total': 'Total',
  'Stock Level': 'Stock Level',
  'Order Quantity': 'Order Quantity',
  'EOQ': 'EOQ',
  'Fulfillment Status': 'Fulfillment Status'
};

const columnMapFinance = {
  'Created Date': 'Created Date',
  'Status': 'Status',
  'Type': 'Type',
  'PO ID': 'PO ID',
  'Receipt Date': 'Receipt Date',
  'Need By': 'Need By',
  'Order Line Number': 'Order Line Number',
  'Order Date': 'Order Date',
  'Invoice (ASN Line)': 'Invoice ASN Line',
  'Item': 'Item',
  'Item Number': 'Item Number',
  'Invoice Line Number': 'Invoice Line Number',
  'Supplier': 'Supplier',
  'Receiver': 'Receiver',
  'Payment Term': 'Payment Term',
  'To Warehouse': 'To Warehouse',
  'To Warehouse Location': 'To Warehouse Location',
  'Quantity': 'Quantity',
  'UOM': 'UOM',
  'Price': 'Price',
  'Currency': 'Currency',
  'Total': 'Total',
  'Quantity1':'Quantity1',
  'Price1':'Price1',
  'Value1':'Value1',
  'ExpectedConsumption':'ExpectedConsumption',
  'ActualConsumption':'ActualConsumption',
  'COGS':'COGS',
  'OrderQty':'OrderQty',
  'EOQ':'EOQ'
};

const columnMapCycleCount = {
  'Cycle Count':'Cycle Count',
  'Warehouse': 'Warehouse',
  'Number of lines':'Number of lines',
  'Total Value': 'Total Value',
  'Currency':'Currency',
  'Created By':'Created By',
  'Created Date':'Created Date',
  'Discrepancy Lines':'Discrepancy Lines',
  'Status':'Status',
  '%':'percentage'
}

const columnMapWarehouse = {
  'Name':'Name',
  'Type':'Type',
  'Active':'Active'
}

const columnMapNC = {
  'Warehouse':'Warehouse',
  'Location':'Location',
  'Item Name':'Item Name',
  'Lot#':'Lot#',
  'Expiration Date':'Expiration Date',
  'Qty':'Qty',
  'UOM':'UOM',
  'PRICE':'PRICE',
  'VALUE':'VALUE'
}

const columnMapSF = {
  'Warehouse':'Warehouse',
  'Location':'Location',
  'Item #':'Item #',
  'Item Name':'Item Name',
  'Lot #':'Lot #',
  'Expiration Date':'Expiration Date',
  'Qty':'Qty',
  'UOM':'UOM',
  'PRICE':'PRICE',
  'VALUE':'VALUE'
}


const dateColumns = ['Created Date','Expiration Date', 'Receipt Date', 'Need By', 'Order Date'];

const formatExcelDate = (value) => {
  if (!value) return null;
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const date = new Date(value);
  return !isNaN(date) ? date.toISOString().split('T')[0] : null;
};

exports.storeFactInventoryData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded.' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const SheetNames = workbook.SheetNames;
    console.log("Sheetnames:",SheetNames);
    const worksheet = workbook.Sheets["S.no. 6"];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel sheet is empty.' });
    }

    // Map and process data
    const mappedData = rawData.map(row => {
      const newRow = {};
      for (const key in row) {
        const dbKey = columnMapFactInventory[key.trim()];
        if (dbKey) {
          const rawValue = row[key];
          if (dateColumns.includes(dbKey)) {
            newRow[dbKey] = formatExcelDate(rawValue);
          } else {
            newRow[dbKey] = typeof rawValue === 'string' && rawValue.length > 500
              ? rawValue.slice(0, 500)
              : rawValue;
          }
        }
      }
      return newRow;
    });

    // Insert in batches
    const columns = Object.keys(mappedData[0]);
    const columnSQL = columns.map(col => `\`${col}\``).join(', ');
    const insertQuery = `INSERT INTO fact_inventory (${columnSQL}) VALUES ?`;

    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const values = batch.map(row => columns.map(col => row[col]));
      await financeDB.query(insertQuery, [values]);
      insertedCount += values.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${values.length} rows)`);
    }

    return res.status(200).json({
      message: '✅ Excel data inserted successfully in batches!',
      insertedRows: insertedCount
    });

  } catch (error) {
    console.error('❌ Insert Error:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

exports.storeFinanaceData = async(req,res) =>{
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded.' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const SheetNames = workbook.SheetNames;
    console.log("Sheetnames:",SheetNames);
    const worksheet = workbook.Sheets[SheetNames];
    // console.log("Worksheet:",worksheet);
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel sheet is empty.' });
    }

    // Map and process data
    const mappedData = rawData.map(row => {
      const newRow = {};
      for (const key in row) {
        const dbKey = columnMapFinance[key.trim()];
        if (dbKey) {
          const rawValue = row[key];
          if (dateColumns.includes(dbKey)) {
            newRow[dbKey] = formatExcelDate(rawValue);
          } else {
            newRow[dbKey] = typeof rawValue === 'string' && rawValue.length > 500
              ? rawValue.slice(0, 500)
              : rawValue;
          }
        }
      }
      return newRow;
    });

    // Insert in batches
    const columns = Object.keys(mappedData[0]);
    const columnSQL = columns.map(col => `\`${col}\``).join(', ');
    const insertQuery = `INSERT INTO fact_finance_table (${columnSQL}) VALUES ?`;

    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const values = batch.map(row => columns.map(col => row[col]));
      await financeDB.query(insertQuery, [values]);
      insertedCount += values.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${values.length} rows)`);
    }

    return res.status(200).json({
      message: '✅ Excel data inserted successfully in batches!',
      insertedRows: insertedCount
    });

  } catch (error) {
    console.error('❌ Insert Error:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
}

exports.storeSupplyChainData = async(req,res) =>{
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded.' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const SheetNames = workbook.SheetNames;
    console.log("Sheetnames:",SheetNames);
    const worksheet = workbook.Sheets[SheetNames];
    // console.log("Worksheet:",worksheet);
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel sheet is empty.' });
    }

    // Map and process data
    const mappedData = rawData.map(row => {
      const newRow = {};
      for (const key in row) {
        const dbKey = columnMapSupplyChain[key.trim()];
        if (dbKey) {
          const rawValue = row[key];
          if (dateColumns.includes(dbKey)) {
            newRow[dbKey] = formatExcelDate(rawValue);
          } else {
            newRow[dbKey] = typeof rawValue === 'string' && rawValue.length > 500
              ? rawValue.slice(0, 500)
              : rawValue;
          }
        }
      }
      return newRow;
    });

    // Insert in batches
    const columns = Object.keys(mappedData[0]);
    const columnSQL = columns.map(col => `\`${col}\``).join(', ');
    const insertQuery = `INSERT INTO fact_supplychainoperations (${columnSQL}) VALUES ?`;

    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const values = batch.map(row => columns.map(col => row[col]));
      await financeDB.query(insertQuery, [values]);
      insertedCount += values.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${values.length} rows)`);
    }

    return res.status(200).json({
      message: '✅ Excel data inserted successfully in batches!',
      insertedRows: insertedCount
    });

  } catch (error) {
    console.error('❌ Insert Error:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
}

exports.storeCycleCountData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded.' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const SheetNames = workbook.SheetNames;
    console.log("Sheetnames:",SheetNames);
    const worksheet = workbook.Sheets["Cycle Count"];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel sheet is empty.' });
    }

    // Map and process data
    const mappedData = rawData.map(row => {
      const newRow = {};
      for (const key in row) {
        const dbKey = columnMapCycleCount[key.trim()];
        if (dbKey) {
          const rawValue = row[key];
          if (dateColumns.includes(dbKey)) {
            newRow[dbKey] = formatExcelDate(rawValue);
          } else {
            newRow[dbKey] = typeof rawValue === 'string' && rawValue.length > 500
              ? rawValue.slice(0, 500)
              : rawValue;
          }
        }
      }
      return newRow;
    });

    // Insert in batches
    const columns = Object.keys(mappedData[0]);
    const columnSQL = columns.map(col => `\`${col}\``).join(', ');
    const insertQuery = `INSERT INTO dim_cyclecount (${columnSQL}) VALUES ?`;

    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const values = batch.map(row => columns.map(col => row[col]));
      await financeDB.query(insertQuery, [values]);
      insertedCount += values.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${values.length} rows)`);
    }

    return res.status(200).json({
      message: '✅ Excel data inserted successfully in batches!',
      insertedRows: insertedCount
    });

  } catch (error) {
    console.error('❌ Insert Error:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

exports.storeWarehouseData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded.' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const SheetNames = workbook.SheetNames;
    console.log("Sheetnames:",SheetNames);
    const worksheet = workbook.Sheets["WareHouse"];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel sheet is empty.' });
    }

    // Map and process data
    const mappedData = rawData.map(row => {
      const newRow = {};
      for (const key in row) {
        const dbKey = columnMapWarehouse[key.trim()];
        if (dbKey) {
          const rawValue = row[key];
          if (dateColumns.includes(dbKey)) {
            newRow[dbKey] = formatExcelDate(rawValue);
          } else {
            newRow[dbKey] = typeof rawValue === 'string' && rawValue.length > 500
              ? rawValue.slice(0, 500)
              : rawValue;
          }
        }
      }
      return newRow;
    });

    // Insert in batches
    const columns = Object.keys(mappedData[0]);
    const columnSQL = columns.map(col => `\`${col}\``).join(', ');
    const insertQuery = `INSERT INTO dim_warehouse (${columnSQL}) VALUES ?`;

    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const values = batch.map(row => columns.map(col => row[col]));
      await financeDB.query(insertQuery, [values]);
      insertedCount += values.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${values.length} rows)`);
    }

    return res.status(200).json({
      message: '✅ Excel data inserted successfully in batches!',
      insertedRows: insertedCount
    });

  } catch (error) {
    console.error('❌ Insert Error:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

exports.storeNCData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded.' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const SheetNames = workbook.SheetNames;
    console.log("Sheetnames:",SheetNames);
    const worksheet = workbook.Sheets["Projected Obsolescence (NC)"];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel sheet is empty.' });
    }

    // Map and process data
    const mappedData = rawData.map(row => {
      const newRow = {};
      for (const key in row) {
        const dbKey = columnMapNC[key.trim()];
        if (dbKey) {
          const rawValue = row[key];
          if (dateColumns.includes(dbKey)) {
            newRow[dbKey] = formatExcelDate(rawValue);
          } else {
            newRow[dbKey] = typeof rawValue === 'string' && rawValue.length > 500
              ? rawValue.slice(0, 500)
              : rawValue;
          }
        }
      }
      return newRow;
    });

    // Insert in batches
    const columns = Object.keys(mappedData[0]);
    const columnSQL = columns.map(col => `\`${col}\``).join(', ');
    const insertQuery = `INSERT INTO \`fact_projected obsolescence(nc)\` (${columnSQL}) VALUES ?`;

    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const values = batch.map(row => columns.map(col => row[col]));
      await financeDB.query(insertQuery, [values]);
      insertedCount += values.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${values.length} rows)`);
    }

    return res.status(200).json({
      message: '✅ Excel data inserted successfully in batches!',
      insertedRows: insertedCount
    });

  } catch (error) {
    console.error('❌ Insert Error:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

exports.storeSFData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded.' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const SheetNames = workbook.SheetNames;
    console.log("Sheetnames:",SheetNames);
    const worksheet = workbook.Sheets["Projected Obsolescence (SF)"];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ message: 'Excel sheet is empty.' });
    }

    // Map and process data
    const mappedData = rawData.map(row => {
      const newRow = {};
      for (const key in row) {
        const dbKey = columnMapSF[key.trim()];
        if (dbKey) {
          const rawValue = row[key];
          if (dateColumns.includes(dbKey)) {
            newRow[dbKey] = formatExcelDate(rawValue);
          } else {
            newRow[dbKey] = typeof rawValue === 'string' && rawValue.length > 500
              ? rawValue.slice(0, 500)
              : rawValue;
          }
        }
      }
      return newRow;
    });

    // Insert in batches
    const columns = Object.keys(mappedData[0]);
    const columnSQL = columns.map(col => `\`${col}\``).join(', ');
    const insertQuery = `INSERT INTO \`fact_projected obsolescence(sf)\` (${columnSQL}) VALUES ?`;

    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < mappedData.length; i += batchSize) {
      const batch = mappedData.slice(i, i + batchSize);
      const values = batch.map(row => columns.map(col => row[col]));
      await financeDB.query(insertQuery, [values]);
      insertedCount += values.length;
      console.log(`✅ Inserted batch ${i / batchSize + 1} (${values.length} rows)`);
    }

    return res.status(200).json({
      message: '✅ Excel data inserted successfully in batches!',
      insertedRows: insertedCount
    });

  } catch (error) {
    console.error('❌ Insert Error:', error.message);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
};