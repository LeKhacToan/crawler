const Apify = require("apify");

Apify.main(async () => {
  const productListDataset = await Apify.openDataset("PRODUCT_LIST");
   // const productDetailDataset = await Apify.Apify.openDataset("PRODUCT_DETAIL");
   
  const sources = await productListDataset.map(async (item) => {
    return `https://shopee.vn/api/v2/item/get?itemid=${item.itemid}&shopid=${item.shopid}`;
  });

  const requestList = await Apify.openRequestList(
    "product-detail-request",
    sources
  );

  const handlePageFunction = async ({ request, json }) => {
    const { name, images, description } = json.item;
    console.log(name);
  };

  const crawler = new Apify.CheerioCrawler({
    requestList,
    handlePageFunction,
    additionalMimeTypes: ["application/json"],
  });

  console.log("CRAWLER PRODUCT DETAIL ...");
  await crawler.run();

  console.log("DONE");
});
