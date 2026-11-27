import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MongoDB connection failed: MONGODB_URI is not set. Add it to your .env file.');
  process.exitCode = 1;
} else if (uri.includes('<db_password>')) {
  console.error('MongoDB connection failed: replace <db_password> in MONGODB_URI with your database password.');
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log(`MongoDB connection successful (database: ${mongoose.connection.name}).`);
  } catch (error) {
    const serverErrors = [...(error?.reason?.servers?.values?.() || [])].map((server) => server.error);
    const causes = [error, error?.cause, ...serverErrors].filter(Boolean);
    const details = causes
      .map((cause) => `${cause.name || ''} ${cause.code || ''} ${cause.codeName || ''} ${cause.message || ''}`)
      .join(' ')
      .toLowerCase();

    if (/authenticat|bad auth|(^|\D)18(\D|$)/.test(details)) {
      console.error('MongoDB authentication failed. Verify the Atlas database username and password. URL-encode special characters in the password.');
    } else if (/mongoparseerror|invalid connection string|invalid scheme/.test(details)) {
      console.error('MongoDB URI is invalid. Copy the Atlas connection string and URL-encode special characters in the username or password.');
    } else if (/enotfound|eai_again|tls|certificate/.test(details)) {
      console.error('Could not resolve or establish a secure connection to the Atlas host. Check the cluster hostname, DNS, and network/firewall settings.');
    } else if (/econnrefused/.test(details)) {
      console.error('The network refused the MongoDB connection. Verify the Atlas cluster is running, your IP is allowed in Network Access, and your network/VPN/firewall permits outbound MongoDB connections. Credentials were not verified yet.');
    } else if (/serverselectiontimeout|timed out|connection timed out/.test(details)) {
      console.error('MongoDB connection timed out. In Atlas, allow your current IP under Network Access and verify the cluster is running and reachable.');
    } else {
      console.error('MongoDB connection failed. Verify the Atlas URI, database user credentials, IP access list, and cluster status.');
    }
    console.error(`Failure type: ${error.name || 'unknown'}${error.code ? ` (code ${error.code})` : ''}.`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
