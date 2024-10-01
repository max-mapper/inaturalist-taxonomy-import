var fs = require("fs");
const csv = require("csv-parser");

var wait = async (t) => {
  return new Promise((resolve) => setTimeout(resolve, t));
};

var taxaList = {};
var missingList = {};
try {
  taxaList = JSON.parse(fs.readFileSync("./plantsmissing/taxalist.json"));
  missingList = JSON.parse(fs.readFileSync("./plantdata/missinglist.json"));
} catch (e) {
  // ignore
}

var interval = setInterval(() => {
  fs.writeFileSync("./plantsmissing/taxalist.json", JSON.stringify(taxaList));
  fs.writeFileSync("./plantdata/missinglist.json", JSON.stringify(missingList));
}, 60 * 1000);

fs.createReadStream(process.argv[2])
  .pipe(csv())
  .on("data", (data) => {
    var taxa = data.ScientificName.replace("ssp.", "")
      .replace("var.", "")
      .replace("subsp.", "")
      .replace(/\s+/g, " ");
    taxaList[taxa] = data;
    taxaList[data.iNatName] = data;
  })
  .on("end", () => {
    startRead();
  });

var matches = fs.createWriteStream("./plantdata/" + process.argv[4] + ".json");
var missing = fs.createWriteStream(
  "./plantsmissing/" + process.argv[4] + ".json"
);

async function startRead() {
  const readStream = fs.createReadStream(process.argv[3]);
  for await (const data of readStream.pipe(csv())) {
    var gbifTaxa = [data.species, data.infraspecificEpithet].join(" ").trim();
    var match = taxaList[gbifTaxa];
    if (!match && data.verbatimScientificName) {
      var vname = data.verbatimScientificName;
      var parts = vname.split(" ");
      var vnameFixed = parts[0];
      parts = parts.slice(1);
      for (var c in parts) {
        var part = parts[c];
        if (part[0].match(/[a-z]/)) {
          vnameFixed += " " + part;
        } else {
          break;
        }
      }
      gbifTaxa = vnameFixed.trim();
      if (gbifTaxa) {
        gbifTaxa = gbifTaxa
          .replace("ssp.", "")
          .replace("var.", "")
          .replace("subsp.", "")
          .replace(/\s+/g, " ")
          .trim();
        match = taxaList[gbifTaxa];
      }
    }
    if (!match && !missingList[gbifTaxa]) {
      var fetched = await fetchTaxa(gbifTaxa);
      await wait(1000);
      if (fetched) {
        best = fetched;
        // inats version of taxa is in native plant list
        if (taxaList[best.scientificName]) {
          match = {
            iNatName: best.scientificName,
            iNatTaxon: "" + best.id,
            gbifFullTaxa: gbifTaxa,
          };
          // inat name map to match
          taxaList[best.scientificName] = match;
          // csv version map to match
          taxaList[gbifTaxa] = match;
        }
      }
    }
    if (match) {
      matches.write(
        JSON.stringify({
          ...data,
          source: process.argv[4],
          gbifFullTaxa: gbifTaxa,
          iNatName: match.iNatName,
          iNatTaxon: match.iNatTaxon,
        }) + "\n"
      );
    } else {
      missing.write(
        JSON.stringify({
          ...data,
          source: process.argv[4],
          gbifFullTaxa: gbifTaxa,
          match: false,
        }) + "\n"
      );
      missingList[gbifTaxa] = data;
    }
  }

  clearInterval(interval);
  fs.writeFileSync("./taxalist.json", JSON.stringify(taxaList));
  matches.end();
  missing.end();
}

var fetchTaxa = async (str) => {
  var url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(
    str
  )}&is_active=true&per_page=1`;
  console.error("Fetching", [str], url);
  const response = await fetchRetry(url, 10000, 3);
  var body = await response.text();
  try {
    results = JSON.parse(body);
  } catch (e) {
    console.error(body);
    console.error(response.headers);
    throw e;
  }
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
