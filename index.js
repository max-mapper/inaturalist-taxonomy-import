const creds = require('./sa.json') // service account json credential export
const { GoogleSpreadsheet } = require('google-spreadsheet')
var fs = require('fs')
const fuzzysort = require('fuzzysort')
const csv = require('csv-parser')
const results = []

var sheetid = process.argv[2]

var wait = async (t) =>{
  return new Promise(resolve => setTimeout(resolve, t));
}

console.log('Loading iNat taxonomy...')
console.time('Loaded')
// https://www.inaturalist.org/taxa/inaturalist-taxonomy.dwca.zip
fs.createReadStream('./inaturalist-taxonomy.dwca/taxa.csv')
  .pipe(csv())
  .on('data', (data) => {
    if (data.taxonRank === 'species' || data.taxonRank === 'variety' || data.taxonRank === 'subspecies') results.push(data)
  })
  .on('end', () => {
    console.timeEnd('Loaded')
    run()
  });

var run = async () => {
  const doc = new GoogleSpreadsheet(sheetid)
  await doc.useServiceAccountAuth(creds)
  
  await doc.loadInfo()
  console.log("Selected document", doc.title)
  for (var i in doc.sheetsByIndex) {
    const sheet = doc.sheetsByIndex[i]
    console.log("Updating sheet:", sheet.title)
    const rows = await sheet.getRows()
    console.time('Done')
    for (var j in rows) {
      var r = rows[j]
      if (r.iNatTaxon || (r.iNatScore && r.iNatScore >= 0)) continue
      var str = r.ScientificName
      .replace('ssp.', '')
      .replace('var.', '')
      .replace(/\s+/g, ' ')
      const matches = fuzzysort.go(str, results, {key:'scientificName'})
      var best
      var score
      if (matches.length === 0 || matches[0].score < 0) {
        var fetched = await fetchTaxa(str)
        await wait(1000)
        if (fetched) {
          score = 0
          best = fetched
        } else {
          console.log(-999999999, str)
          continue
        }
      } else {
        best = matches[0].obj
        score = matches[0].score
      }
      console.log(score, [str, best.scientificName], best.id)
      if (score === 0) r.iNatTaxon = best.id
      r.iNatName = best.scientificName
      r.iNatScore = score
      await r.save()
      await wait(1000)
    }
    console.timeEnd('Done')
  }  
}

var fetchTaxa = async (str) => {
  var url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(str)}&is_active=true&per_page=1`
  console.log(url)
  const response = await fetch(url)
  const results = await response.json()
  var r = results.results
  if (r && r[0] && r[0].id) return {
    id: r[0].id,
    scientificName: r[0].name
  }
}

