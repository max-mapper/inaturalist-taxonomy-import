# inaturalist-taxonomy-import

`index.js` takes a google spreadsheet with a column ScientificName and looks up the string and finds the closest matching inat taxonomy ID. saves results in 3 columns (you must create these columns ahead of time): iNatName, iNatScore, iNatTaxon

`upload.js` uploads a set of taxon ids from a sheet to an existing iNaturalist project. Sheet must have a column iNatTaxon (created and filled in by `index.js` or manually)

a `sa.json` file is required (service account credentials json export), and google sheet permissions must be set to 'anyone with link can edit`

This code was used to create https://www.inaturalist.org/projects/cnps-rare-plants