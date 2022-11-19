require("dotenv").config();

const Configurator = require("./configurator.js");
const ConfiguratorLoader = require("./configurator-loader.js");
const PrivateKeyLoader = require("./private-key-loader.js");
const ABIUploader = require("./abi-uploader.js");
const VersionUploader = require("./version-uploader.js");

module.exports = {
    async getProps() {
        const network = idx > -1 ? process.argv[idx + 1] : "development";
        console.log(`## ${network} network ##`);

        const deploymentAccount = accounts[0];
        const remotelyManagedNetworks = (process.env.S3_BUCKET_SUFFIXES || "").split(":");
        const configLocalPath = process.env.CONFIG_LOCAL_PATH;

        let configLoader;
        if (remotelyManagedNetworks.includes(network)) {
            const bucket = `${process.env.S3_BUCKET_PREFIX}-${network}`;
            const key = process.env.S3_CONFIG_KEY;
            configLoader = new ConfiguratorLoader.S3(bucket, key);
        } else if (configLocalPath){
            configLoader = new ConfiguratorLoader.Local(configLocalPath)   
        } else {
            const fileName = env ? `${network}.${env}.json` : `${network}.json`
            const filePath = path.join(__dirname, "./config", fileName)
            configLoader = new configLoader.Local(filePath)
        }
        const configurator = new Configurator(configLoader)
        await configurator.load()
        const {config} = configurator

        
    }
}