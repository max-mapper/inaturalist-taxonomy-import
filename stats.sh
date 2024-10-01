time node gbif-inat.js ./plantdata/calflora.csv ./plantdata/0020325-240906103802322-fixed.csv calflora
time node gbif-inat.js ./plantdata/burgeetal2016.csv ./plantdata/0020325-240906103802322-fixed.csv burge
time node gbif-inat.js ./plantdata/jepson.csv ./plantdata/0020325-240906103802322-fixed.csv jepson

cat plantsmissing/jepson.json | jsonfilter gbifFullTaxa | sort | uniq -c | sort -rn > ./plantsmissing/jepson.txt
cat plantsmissing/burge.json | jsonfilter gbifFullTaxa | sort | uniq -c | sort -rn > ./plantsmissing/burge.txt
cat plantsmissing/calflora.json | jsonfilter gbifFullTaxa | sort | uniq -c | sort -rn > ./plantsmissing/calflora.txt
cat plantsmissing/*.json | jsonfilter gbifFullTaxa | grep -f plantsmissing-natives/summary.txt -v - | sort | uniq -c | sort -rn > plantsmissing/summary.txt 

cat plantdata/jepson.json | jsonfilter gbifFullTaxa | sort | uniq -c | sort -rn > ./plantdata/jepson.txt
cat plantdata/burge.json | jsonfilter gbifFullTaxa | sort | uniq -c | sort -rn > ./plantdata/burge.txt
cat plantdata/calflora.json | jsonfilter gbifFullTaxa | sort | uniq -c | sort -rn > ./plantdata/calflora.txt
cat plantdata/*.json | jsonfilter gbifFullTaxa | sort | uniq -c | sort -rn > ./plantdata/summary.txt
