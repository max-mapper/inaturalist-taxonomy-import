var request = require('request')
var auth = process.env['INAT_AUTHORIZATION_HEADER']
var projectid = process.argv[2]
var seen = {}

// uploads rows with a valid iNatTaxon value to an existing iNat Project
var run = async () => {

  let formData = {}
  var setk = (k,v) => {
    formData[k] = v
  }
  var id = await fetchId(projectid)
  var count = 1
  setk(`project[project_observation_rules_attributes][${count}][operator]`, "observed_in_place?")
  setk(`project[project_observation_rules_attributes][${count}][operand_type]`, "Place")
  setk(`project[project_observation_rules_attributes][${count}][operand_id]`, 62068)
  setk(`project[project_observation_rules_attributes][${count}][id]`, id)
  setk(`project[project_observation_rules_attributes][${count}][_destroy]`, `true`)
  console.log(count)
  console.log(formData)
  await wait(1000)
  var url = 'https://api.inaturalist.org/v1/projects/' + projectid
  request.put({url, headers: {'Authorization': auth}, formData}, function optionalCallback(err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!');
  });
}

var fetchId = async (str) => {
    var url = `https://api.inaturalist.org/v1/projects/${str}`
    console.log(url)
    const response = await fetch(url)
    const results = await response.json()
    return results.results[0].project_observation_rules[0].id
}
  
var wait = async (t) =>{
    return new Promise(resolve => setTimeout(resolve, t));
  }

run()