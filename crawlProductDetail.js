const Apify = require("apify");
const fs = require("fs");
const https = require("https");

const localPath = "./images/";

const saveImageToDisk = (url, localPath) => {
  let file = fs.createWriteStream(localPath);
  https.get(url, function (response) {
    response.pipe(file);
  });
};

Apify.main(async () => {
  const productListDataset = await Apify.openDataset("PRODUCT_LIST");
  const productDetailListDataset = await Apify.openDataset(
    "PRODUCT_DETAIL_LIST"
  );

  const requestQueue = await Apify.openRequestQueue();

  const productsCrawled = await productDetailListDataset.map(
    async (item) => item.itemid
  );

  await productListDataset.map(async (item) => {
    await requestQueue.addRequest({
      url: `https://shopee.vn/api/v2/item/get?itemid=${item.itemid}&shopid=${item.shopid}`,
    });
  });

  const handlePageFunction = async ({ request, json }) => {
    const { itemid, name, images, description, price } = json.item;
    images.map((i) => {
      saveImageToDisk(
        "https://cf.shopee.vn/file/" + i,
        [localPath, i, ".jpg"].join("")
      );
    });

    if (!productsCrawled.includes(itemid)) {
      await productDetailListDataset.pushData({
        itemid,
        name,
        description,
        price,
        images: images.map((i) => i + ".jpg"),
      });
    }
  };

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    handlePageFunction,
    additionalMimeTypes: ["application/json"],
  });

  console.log("CRAWL PRODUCT DETAIL ...");
  await crawler.run();

  console.log("DONE");
});
