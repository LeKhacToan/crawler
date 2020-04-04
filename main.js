const Apify = require("apify");

const LIMIT = 100;

const loadMoreUrl = (matchId, newest) => {
  return `https://shopee.vn/api/v2/search_items/?by=relevancy&limit=${LIMIT}&match_id=${matchId}&newest=${newest}&order=desc&page_type=shop&version=2`;
};

Apify.main(async () => {
  const productListDataset = await Apify.openDataset("PRODUCT_LIST");
  // const productDetailDataset = await Apify.Apify.openDataset("PRODUCT_DETAIL");

  const input = await Apify.getInput();
  const sources = input.map(
    (matchId) =>
      `https://shopee.vn/api/v2/search_items/?by=relevancy&limit=${LIMIT}&match_id=${matchId}&newest=0&order=desc&page_type=shop&version=2`
  );

  const requestList = await Apify.openRequestList(
    "product-list-request",
    sources
  );

  const requestQueue = await Apify.openRequestQueue();
  // await requestQueue.addRequest({
  //   url: `https://shopee.vn/api/v2/search_items/?by=relevancy&limit=${LIMIT}&match_id=132715430&newest=0&order=desc&page_type=shop&version=2`,
  // });

  const handlePageFunction = async ({ request, json }) => {
    const { items } = json;
    const matchId = new URL(request.url).searchParams.get("match_id");

    if (items.length !== 0) {
      const results = items.map((i) => {
        return {
          itemid: i.itemid,
          shopid: Number(matchId),
        };
      });
      await productListDataset.pushData(results);

      await requestQueue.addRequest({
        url: loadMoreUrl(
          matchId,
          Number(new URL(request.url).searchParams.get("newest")) + items.length
        ),
      });
    }
  };

  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    handlePageFunction,
    additionalMimeTypes: ["application/json"],
  });

  console.log("CRAWLER PRODUCT LIST ...");
  await crawler.run();

  // CRAWLER PRODUCT DETAIL
  const productDetailSources = await productListDataset.map(async (item) => {
    return `https://shopee.vn/api/v2/item/get?itemid=${item.itemid}&shopid=${item.shopid}`;
  });

  const productDetailRequestList = await Apify.openRequestList(
    "product-detail-request",
    productDetailSources
  );

  const handlePageProductDetailFunction = async ({ request, json }) => {
    const { name, images, description } = json.item;
    console.log(name);
  };

  const productDetailcrawler = new Apify.CheerioCrawler({
    requestList: productDetailRequestList,
    handlePageFunction: handlePageProductDetailFunction,
    additionalMimeTypes: ["application/json"],
  });

  console.log("CRAWLER PRODUCT DETAIL ...");
  await productDetailcrawler.run();

  console.log("DONE");
});
