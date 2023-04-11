const creds = require('./sa.json') // service account json credential export
const { GoogleSpreadsheet } = require('google-spreadsheet')
var request = require('request')
var auth = process.env['INAT_AUTHORIZATION_HEADER']
var docid = process.argv[2]
var sheetname = process.argv[3]
var projectid = process.argv[4]

// uploads rows with a valid iNatTaxon value to an existing iNat Project
var run = async () => {
  const doc = new GoogleSpreadsheet(docid)
  await doc.useServiceAccountAuth(creds)
  await doc.loadInfo()
  const sheet = doc.sheetsByTitle[sheetname]
  const rows = await sheet.getRows()

  let formData = {}
  var setk = (k,v) => {
    formData[k] = v
  }
  var count = 1

  rows.forEach((r) => {
    if (!r.iNatTaxon) return
    setk(`project[project_observation_rules_attributes][${count}][operator]`, "in_taxon?")
    setk(`project[project_observation_rules_attributes][${count}][operand_type]`, "Taxon")
    setk(`project[project_observation_rules_attributes][${count}][operand_id]`, `${r.iNatTaxon}`)
    count++
  })
  console.log(count)
  var url = 'https://api.inaturalist.org/v1/projects/' + projectid
  request.put({url, headers: {'Authorization': auth}, formData}, function optionalCallback(err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
  });
}

run()