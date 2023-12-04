import * as DB from "./db";
import * as Queue from "./queue";
import * as S3 from "./s3";
import * as SES from "./ses";

const ScrapingStack = { DB, Queue, S3, SES };

export default ScrapingStack;
