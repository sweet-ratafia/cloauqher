import { GzipHugeFile } from 'ath-gziphugefile';


const zips = await findZips();
const txtFiles = await findTxtFiles(zips);
console.log(txtFiles);

// retrieve all txt files from zip and zip them into one huge file 
GzipHugeFile.fromFiles(txtFiles).toFile('all-txt-files.zip');
console.log('all txt files zipped into all-txt-files.zip');