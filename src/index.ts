import { createAddon, runCli } from "@mediaurl/sdk";
import * as cheerio from "cheerio";
const axios = require("axios");

interface TrtIzleItem {
    title: string;
    thumbnail: string;
    link: string;
    isDic: boolean;
}

const parseList = async (html: string, search): Promise<TrtIzleItem[]> => {
    const results: TrtIzleItem[] = [];
    const $ = cheerio.load(html);

    if(search) {
        $("div.card-content").each((index, elem) => {
            const thumbnail = $(elem)
                .find("a")
                .first()
                .attr("data-player-image") as string;
            const item: TrtIzleItem = {
                title: $(elem).find(".card-title").find("a").text(),
                thumbnail: thumbnail || "",
                link: $(elem)
                    .find("a")
                    .first()
                    .attr("href") as string,
                isDic: true,
            };
            results.push(item);
        });
        return results;
    }

    if ($("div.card-external-hover").length > 0) {
        $("div.card-external-hover").each((index, elem) => {
            const thumbnail = $(elem)
                .find("img")
                .first()
                .attr("data-src") as string;
            const item: TrtIzleItem = {
                title: $(elem).find("a").attr("aria-label") as string,
                thumbnail: thumbnail || "",
                link: $(elem).find("a").first().attr("href") as string,
                isDic: false,
            };
            results.push(item);
        });
    } else if ($(".show-detail--content").length > 0) {
        $(".show-detail--content").each((index, elem) => {
            const thumbnail = $(elem)
                .find("img")
                .first()
                .attr("src") as string;
            const item: TrtIzleItem = {
                title: $(elem).find("img").attr("alt") as string,
                thumbnail: thumbnail || "",
                link: $(elem).find(".show-detail--content__buttons").find("a").first().attr("href") as string,
                isDic: false,
            };
            results.push(item);
        });
    } else if ($("div.card-details").length > 0) {
        $("div.card-details").each((index, elem) => {
            const thumbnail = $(elem)
                .find("a")
                .first()
                .attr("data-player-image") as string;
            const item: TrtIzleItem = {
                title: $(elem).find(".card-title").find("a").text(),
                thumbnail: thumbnail || "",
                link: $(elem)
                    .find(".card-subinfo")
                    .find("a")
                    .last()
                    .attr("href") as string,
                isDic: true,
            };
            results.push(item);
        });
    } else {
        $("div.card-details").each((index, elem) => {
            const thumbnail = $(elem)
                .find("a")
                .first()
                .attr("data-player-image") as string;
            const item: TrtIzleItem = {
                title: $(elem).find(".card-title").find("a").text(),
                thumbnail: thumbnail || "",
                link: $(elem)
                    .find(".card-subinfo")
                    .find("a")
                    .first()
                    .attr("href") as string,
                isDic: false,
            };
            results.push(item);
        });
    }
    return results;
};

export const trtIzleAddon = createAddon({
    id: "trtIzle",
    name: "Trt Izle",
    description: "Trt Izle Videos",
    icon: "https://cdn-s.pr.trt.com.tr/trtizle/images/icons/favicon.ico",
    version: "0.0.1",
    itemTypes: ["movie", "series"],
    dashboards: [
        {
            id: "/programlar",
            name: "PROGRAM",
        },
        {
            id: "/diziler",
            name: "DİZİ",
        },
        {
            id: "/belgesel",
            name: "BELGESEL",
        },
        {
            id: "/filmler",
            name: "Filmler",
        },
        {
            id: "/cocuk",
            name: "ÇOCUK",
        },
    ],
    catalogs: [
        {
            features: {
                search: { enabled: true },
            },
            options: {
                imageShape: "landscape",
                displayName: true,
            },
        },
    ],
});

trtIzleAddon.registerActionHandler("catalog", async (input, ctx) => {
    const { fetch } = ctx;
    const { id } = input; // cagetory get name
    let search = false;
    let url = "https://www.trtizle.com";
    if (id) {
        url = url + id; // get category
    } else if (input.search) {
        url = url + "/search?q=" + input.search; // get search
        search = true
    }

    const results = await fetch(url).then(async (resp) => {
        return parseList(await resp.text(), search);
    });

    return {
        nextCursor: null,
        items: results.map((item) => {
            const id = item.link;
            if (item.isDic) {
                return {
                    id,
                    ids: { id },
                    type: "directory",
                    name: `${item.title}`,
                    images: {
                        poster: item.thumbnail,
                    },
                };
            } else {
                return {
                    id,
                    ids: { id },
                    type: "movie",
                    name: `${item.title}`,
                    images: {
                        poster: item.thumbnail,
                    },
                };
            }
        }),
    };
});

trtIzleAddon.registerActionHandler("item", async (input, ctx) => {
    const url = "https://www.trtizle.com/api/video?path=" + input.ids.id;
    var videoarray = new Array();
    var qualities = ["144", "240", "360", "480", "720", "1080"];
  
    const getDygvideo = () => {
      try {
        return axios.get(url);
      } catch (error) {
        console.error(error);
      }
    };
  
    const jsondata = await getDygvideo();

    var source = jsondata.data.video;
    for (var i in qualities) {
      videoarray.push({
        type: "url",
        url: source.hlsUrl.replace("master", "master" + qualities[i] + "p"),
        name: qualities[i] + "p",
      });
    }
    return {
      type: "movie",
      ids: input.ids,
      title: source.title,
      name: jsondata.title,
      description: jsondata.cmsTitle,
      images: {
        poster: jsondata.ytThumbnailUrl,
      },
      sources: videoarray,
    };
  });

runCli([trtIzleAddon], { singleMode: false });
