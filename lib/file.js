import { sparqlEscapeString,
  sparqlEscapeUri,
  sparqlEscapeInt,
  sparqlEscapeDateTime,
  uuid as generateUuid
} from 'mu';
import { RESOURCE_BASE } from '../config';

const MU_APPLICATION_GRAPH = process.env['MU_APPLICATION_GRAPH']
const RELATIVE_STORAGE_PATH = (process.env['MU_APPLICATION_FILE_STORAGE_PATH'] || '').trimEnd('/')

export async function createFile(file, physicalUri, update, graph = MU_APPLICATION_GRAPH) {
  const uri = RESOURCE_BASE + `/files/${file.id}`;
  const physicalUuid = generateUuid();
  const q = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX dbpedia: <http://dbpedia.org/ontology/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>

  INSERT DATA {
      GRAPH ${sparqlEscapeUri(graph)} {
          ${sparqlEscapeUri(uri)} a nfo:FileDataObject ;
                nfo:fileName ${sparqlEscapeString(file.name)} ;
                mu:uuid ${sparqlEscapeString(file.id)} ;
                dct:format ${sparqlEscapeString(file.format)} ;
                nfo:fileSize ${sparqlEscapeInt(file.size)} ;
                dbpedia:fileExtension ${sparqlEscapeString(file.extension)} ;
                dct:created ${sparqlEscapeDateTime(file.created)} ;
                dct:modified ${sparqlEscapeDateTime(file.created)} .
          ${sparqlEscapeUri(physicalUri)} a nfo:FileDataObject ;
                nie:dataSource ${sparqlEscapeUri(uri)} ;
                nfo:fileName ${sparqlEscapeString(`${physicalUuid}.${file.extension}`)} ;
                mu:uuid ${sparqlEscapeString(physicalUuid)} ;
                dct:format ${sparqlEscapeString(file.format)} ;
                nfo:fileSize ${sparqlEscapeInt(file.size)} ;
                dbpedia:fileExtension ${sparqlEscapeString(file.extension)} ;
                dct:created ${sparqlEscapeDateTime(file.created)} ;
                dct:modified ${sparqlEscapeDateTime(file.created)} .
      }
  }`;
  await update(q);
  file.uri = uri;
  return file;
};

// Ported from https://github.com/mu-semtech/file-service/blob/dd42c51a7344e4f7a3f7fba2e6d40de5d7dd1972/web.rb#L228
export function sharedUriToPath(uri) {
  return uri.replace('share://', '/share/')
}

// Ported from https://github.com/mu-semtech/file-service/blob/dd42c51a7344e4f7a3f7fba2e6d40de5d7dd1972/web.rb#L232
export function fileToSharedUri(fileName) {
  if (RELATIVE_STORAGE_PATH) {
    return `share://${RELATIVE_STORAGE_PATH}/${fileName}`;
  }
  return `share://${fileName}`
}
