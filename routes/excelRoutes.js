const express = require('express');
const multer = require('multer');
const path = require('path');
const data = require('../controllers/data');

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

// Route to handle Excel upload
router.post('/upload-fact-invetory',upload.single('file'),data.storeFactInventoryData);
router.post('/upload-finance-data',upload.single('file'),data.storeFinanaceData)
router.post('/upload-supply-chain-data',upload.single('file'),data.storeSupplyChainData);
router.post('/upload-cycle-count-data',upload.single('file'),data.storeCycleCountData);
router.post('/upload-warehouse-data',upload.single('file'),data.storeWarehouseData);
router.post('/upload-nc-data',upload.single('file'),data.storeNCData);
router.post('/upload-sf-data',upload.single('file'),data.storeSFData);

module.exports = router;
