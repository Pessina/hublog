import * as DB from "./db";
import * as Queue from "./queue";
import * as S3 from "./s3";

const ScrapingStack = { DB, Queue, S3 };

export default ScrapingStack;
