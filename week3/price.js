import axios from "axios";
import http from "http";
import { object, string, number } from "yup";

const productScheme = object({
    title: string("this should be a string").required(),
    price: number("this should be anumber").positive().required(),
    description: string("this should be a string"),
    categoryId: number("this should be anumber").positive().required().integer(),
})

const groupWithCatogry = (allProduct , cur) => {
    let translatedResponse = [];
    allProduct.forEach(obj => {
        let catogryObj = {
            category: {
                id: obj.category.id,
                name: obj.category.name
            },
            products: [],
        };
        translatedResponse.push(catogryObj);
    });
    const key = "id";
    translatedResponse = [...new Map(translatedResponse.map(item =>
        [item.category[key], item]
    )).values()];

    translatedResponse.forEach(ele => {
        let sameCatogriy = [];
        allProduct.forEach(obj => {
            if (ele.category.id == obj.category.id) {
                obj.price = Number((obj.price*cur).toFixed(4));
                sameCatogriy.push(obj);
            }
        })
        ele.products = sameCatogriy;
    });
    return translatedResponse;
}


const server = http.createServer((req, res) => {
    
    if (req.method === "GET") {
        const currency = (req.url).split("=").at(-1)?.toUpperCase();
        console.log(currency);

        (async () => {
            const [products, currency] =await Promise.all([
                await axios.get("https://api.escuelajs.co/api/v1/products"),
                await axios.get("https://api.exchangerate.host/latest?base=USD")
            ]);
            let currencyPrice = currency.data.rates[`${currency}`] || 1;
            let allProduct = products.data;
    
            let filterdProduct = groupWithCatogry(allProduct , currencyPrice);
            res.setHeader("content-type", "application/json");
            res.writeHead(200);
            res.write(JSON.stringify(filterdProduct));
            res.end();
        })();
    }
   
    if (req.method === "POST") {
        let chuncks = [];
        req.on("data", chunk => {
            chuncks.push(chunk);
        });
        req.on("end", () => {
            try {
                let newProduct = productScheme.validateSync(JSON.parse(chuncks.toString()), {
                    strict: true,
                });
                (async () => {
                    let postResponse =await axios.post("https://api.escuelajs.co/api/v1/products/", newProduct, {
                    headers: { 'Content-Type': 'application/json' }
                    });
                    res.setHeader("content-type", "application/json");
                    res.writeHead(201);
                    res.write(JSON.stringify(postResponse.data));
                    res.end();
                 })();
               
            } catch (error) {
                res.writeHead(400);
                res.end();
            }
        });
        req.on("error", (error) => {
            res.setHeader("content-type", "text");
            res.writeHead(500);
            res.write(error.message);
            res.end();
        });
    }
    
});


server.listen(8000, () => {
    console.log("server is running in http://localhost:8000")
})
