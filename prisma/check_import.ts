import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, '../barberprestationHag&ink.csv');

const results: any[] = [];

fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log(`Analyse de ${results.length} lignes...`);
    
    results.forEach((row, index) => {
      // 1. Vérification de la date
      const date = new Date(row.Date);
      if (isNaN(date.getTime())) {
        console.error(`❌ Ligne ${index + 1}: Date invalide "${row.Date}"`);
      }
      
      // 2. Vérification du montant
      if (isNaN(parseFloat(row.Montant))) {
        console.error(`❌ Ligne ${index + 1}: Montant invalide "${row.Montant}"`);
      }
    });
    console.log("Analyse terminée.");
  });