const creds = require("./sa.json"); // service account json credential export
const { GoogleSpreadsheet } = require("google-spreadsheet");
var fs = require("fs");
const fuzzysort = require("fuzzysort");
const csv = require("csv-parser");
const taxa = [];

var sheetid = process.argv[2];

var wait = async (t) => {
  return new Promise((resolve) => setTimeout(resolve, t));
};

console.log("Loading iNat taxonomy...");
console.time("Loaded");
// https://www.inaturalist.org/taxa/inaturalist-taxonomy.dwca.zip
fs.createReadStream("./taxa.csv")
  .pipe(csv())
  .on("data", (data) => {
    if (
      data.taxonRank === "species" ||
      data.taxonRank === "variety" ||
      data.taxonRank === "subspecies"
    )
      taxa.push(data);
  })
  .on("end", () => {
    console.timeEnd("Loaded");
    run();
  });

var run = async () => {
  const doc = new GoogleSpreadsheet(sheetid);
  await doc.useServiceAccountAuth(creds);

  await doc.loadInfo();
  console.log("Selected document", doc.title);
  for (var i in doc.sheetsByIndex) {
    const sheet = doc.sheetsByIndex[i];

    await sheet.loadCells("A1:A2");
    var firstCell = sheet.getCell(0, 0);
    if (firstCell.value !== "iNatTaxon") continue; // skip this sheet

    console.log("Updating sheet:", sheet.title);
    // first pass: local taxon lookups
    await sheet.loadCells("A2:C" + sheet.rowCount);
    for (var i = 1; i < sheet.rowCount; i++) {
      var taxon = sheet.getCell(i, 0);
      var name = sheet.getCell(i, 1);
      var scientificName = sheet.getCell(i, 2);
      if (taxon.value !== null) continue;
      if (!scientificName.value) continue;
      var str = scientificName.value
        .replace("ssp.", "")
        .replace("var.", "")
        .replace("subsp.", "")
        .replace(/\s+/g, " ");
      const matches = fuzzysort.go(str, taxa, {
        key: "scientificName",
      });
      if (matches.length) {
        var best = matches[0].obj;
        taxon.value = best.id;
        name.value = best.scientificName;
      }
      if (i % 500 === 0) {
        console.log("Saving batch...");
        await sheet.saveUpdatedCells();
      }
    }
    await sheet.saveUpdatedCells();
    console.log("Second pass");
    // second pass: network lookups
    const rows = await sheet.getRows();
    console.time("Done");
    for (var j in rows) {
      var r = rows[j];
      if (r.iNatTaxon) continue;
      var str = r.ScientificName.replace("ssp.", "")
        .replace("var.", "")
        .replace("subsp.", "")
        .replace(/\s+/g, " ");
      const matches = fuzzysort.go(str, taxa, { key: "scientificName" });
      var best;
      if (matches.length === 0) {
        var fetched = await fetchTaxa(str);
        await wait(1000);
        if (fetched) {
          best = fetched;
        } else {
          console.log(-999999999, str);
          best = { id: -999999999 };
        }
      } else {
        best = matches[0].obj;
      }
      console.log([str, best.scientificName], best.id);
      r.iNatTaxon = best.id;
      if (best.scientificName) r.iNatName = best.scientificName;
      await r.save();
      await wait(1000);
    }
    console.timeEnd("Done");
  }
};

var fetchTaxa = async (str) => {
  var url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(
    str
  )}&is_active=true&per_page=1`;
  console.log(url);
  const response = await fetchRetry(url, 10000, 3);
  const results = await response.json();
  var r = results.results;
  if (r && r[0] && r[0].id)
    return {
      id: r[0].id,
      scientificName: r[0].name,
    };
};

function wait(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function fetchRetry(url, delay, tries, fetchOptions = {}) {
  function onError(err) {
    triesLeft = tries - 1;
    if (!triesLeft) {
      throw err;
    }
    return wait(delay).then(() =>
      fetchRetry(url, delay, triesLeft, fetchOptions)
    );
  }
  return fetch(url, fetchOptions).catch(onError);
}
