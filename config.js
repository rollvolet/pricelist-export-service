const RESOURCE_BASE = 'http://mu.semte.ch/services/pricelist-export-service';
const MU_APPLICATION_FILE_STORAGE_PATH = '';
const STORAGE_PATH = `/share/${MU_APPLICATION_FILE_STORAGE_PATH}`;

const PRICELIST_EXPORT_TASK_ALL_PROD_OP = 'http://data.rollvolet.be/pricelist-export/task-operations/all-products-export';
const PRICELIST_EXPORT_TASK_STOCK_OP = 'http://data.rollvolet.be/pricelist-export/task-operations/stock-list-export';

const VAT_RATE = 21;

export {
  RESOURCE_BASE,
  STORAGE_PATH,
  PRICELIST_EXPORT_TASK_ALL_PROD_OP,
  PRICELIST_EXPORT_TASK_STOCK_OP,
  VAT_RATE,
};
