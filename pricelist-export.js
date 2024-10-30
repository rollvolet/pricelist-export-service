import fs from 'fs';
import { createFile, fileToSharedUri, sharedUriToPath } from './lib/file';
import { querySudo } from "@lblod/mu-auth-sudo";
import { uuid as generateUuid } from 'mu';

import { sparqlJsonToCsv } from './lib/sparql-csv-util';
import { VAT_RATE } from './config';

function pricelistQuery(includeNonListedStock = false) {
  // filter by "Neem op in voorraadlijst"
  let nonListedFilter;
  if (includeNonListedStock) {
    nonListedFilter = '';
  } else {
    nonListedFilter = '?s ext:includeInStockReport "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean> .';
  }
  const queryString = `
PREFIX gr: <http://purl.org/goodrelations/v1#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX pricing: <http://data.rollvolet.be/vocabularies/pricing/>
PREFIX stock: <http://data.rollvolet.be/vocabularies/stock-management/>
PREFIX schema: <http://schema.org/>

SELECT ?id ?category ?subcategory ?name ?supplier ?ikp ?ikpUnit ?vkp ?vkpIncl ?margin ?vkpBase ?vkpUnit ?department WHERE {
  GRAPH ?g {
   ?s a gr:SomeItems ;
      gr:name ?name ;
      dct:identifier ?id ;
      ext:purchaseOffering ?purchase ;
      ext:salesOffering ?sales .
   ${nonListedFilter}
   OPTIONAL {
     ?s gr:category ?subcategoryUri .
     ?subcategoryUri skos:prefLabel ?subcategory .
     OPTIONAL {
         ?subcategoryUri skos:broader/skos:prefLabel ?category .
     }
   }
   OPTIONAL {
     ?purchase ^gr:offers/gr:name ?supplier ;
         gr:hasPriceSpecification ?priceIn .
     OPTIONAL {
       ?priceIn gr:hasCurrencyValue ?ikp .
     }
     OPTIONAL {
       ?priceIn gr:hasUnitOfMeasurement/skos:prefLabel ?ikpUnit .
     }
   }
   OPTIONAL {
     ?sales gr:hasPriceSpecification ?priceOut .
     ?priceOut gr:valueAddedTaxIncluded "true"^^<http://mu.semte.ch/vocabularies/typed-literals/boolean> .
     OPTIONAL {
       ?priceOut gr:hasCurrencyValue ?vkpIncl .
     }
     OPTIONAL {
       ?priceOut pricing:margin ?margin .
     }
     OPTIONAL {
       ?priceOut pricing:calculationBasis ?calc .
       ?calc skos:prefLabel ?vkpBase .
     }
     OPTIONAL {
       ?priceOut gr:hasUnitOfMeasurement/skos:prefLabel ?vkpUnit .
     }
   }
   OPTIONAL {
     ?s stock:location/stock:department/schema:name ?department .
   }
   BIND(IF(BOUND(?vkpIncl), ?vkpIncl * 100 / (100 + ${VAT_RATE}), 0) as ?vkp)
 }
} ORDER BY ?category ?subcategory ?id
`;
  return queryString;
}

function exportFileName() {
  const date = new Date();
  const [month, day, year] = [
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0'),
    date.getFullYear().toString(),
  ];
  const [hours, minutes, seconds] = [
    date.getHours().toString().padStart(2, '0'),
    date.getMinutes().toString().padStart(2, '0'),
    date.getSeconds().toString().padStart(2, '0'),
  ];
  return `pricelist_export_${year}${month}${day}_${hours}${minutes}${seconds}.csv`
}

export default async function exportPricelist(includeNonListed, graph) {
  const _pricelistQuery = pricelistQuery(includeNonListed);
  const pricelistResult = await querySudo(_pricelistQuery);
  const pricelistCsvResult = sparqlJsonToCsv(pricelistResult);
  const fileName = exportFileName();
  const fileUri = fileToSharedUri(fileName);
  const filePath = sharedUriToPath(fileUri);
  fs.writeFileSync(filePath, pricelistCsvResult);

  const filestats = fs.statSync(filePath);
  const csvFile = {
    id: generateUuid(),
    name: fileName,
    extension: '.csv',
    format: 'text/csv',
    size: filestats.size,
    created: filestats.birthtime
  };
  const muFile = await createFile(csvFile, fileUri, querySudo, graph);
  return muFile;
}
