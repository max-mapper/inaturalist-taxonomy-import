var fs = require("fs");
// const fuzzysort = require("fuzzysort");
const csv = require("csv-parser");

var wait = async (t) => {
  return new Promise((resolve) => setTimeout(resolve, t));
};

var taxaList = {};
var backupList = {};
// console.log("Loading reference taxonomy...");
// console.time("Loaded");
// https://www.inaturalist.org/taxa/inaturalist-taxonomy.dwca.zip
fs.createReadStream(process.argv[2])
  .pipe(csv())
  .on("data", (data) => {
    var taxa = data.ScientificName.replace("ssp.", "")
      .replace("var.", "")
      .replace("subsp.", "")
      .replace(/\s+/g, " ");
    taxaList[taxa] = data;
    backupList[data.iNatName] = data;
  })
  .on("end", () => {
    // console.timeEnd("Loaded");
    run();
  });

// gbif plantae filtered by burge - inat taxon
// gbif plantae filtered by calflora - inat taxon
// gbif plantae filtered by jepson - inat taxon
// sort | uniq version

// GBIF G S E match against ScientificName
// then against iNatName

// input:
// gbif row

// output:
// {
//   .. gbif row
//   source: 'jepson',
//   GSE: 'Chlorogalum purpureum purpureum',
//   iNatName: 'Hooveria purpurea'
//   iNatTaxon: 1362971
// }

var run = () => {
  fs.createReadStream("./0020325-240906103802322-fixed.csv")
    .pipe(csv())
    .on("data", (data) => {
      var gbifTaxa = [data.species, data.infraspecificEpithet].join(" ").trim();
      console.log(gbifTaxa);
      return;
      var match = taxaList[gbifTaxa];
      if (!match) match = backupList[gbifTaxa];
      if (match) {
        // console.log(
        //   JSON.stringify({
        //     ...data,
        //     source: "burge",
        //     gbifFullTaxa: gbifTaxa,
        //     iNatName: match.iNatName,
        //     iNatTaxon: match.iNatTaxon,
        //   })
        // );
      } else {
        console.log(
          JSON.stringify({
            ...data,
            source: "calflora",
            gbifFullTaxa: gbifTaxa,
            match: false,
          })
        );
      }

      // // const matches = fuzzysort.go(gbifTaxa, taxaList, {
      // //   key: "ScientificNameSearch",
      // // });
      // var best;
      // if (matches.length === 0) {
      //   // no matches
      //   // console.log(gbifTaxa);
      // } else {
      //   console.log(matches[0].score);
      //   best = matches[0].obj;
      //   var result = {
      //     ...data,
      //     source: "BurgeEtAl2016",
      //     iNatName: best.iNatName,
      //     iNatTaxon: best.iNatTaxon,
      //   };
      //   // console.log(JSON.stringify(result));
      // }
    });
};
