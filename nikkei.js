const cheerio = require('cheerio');
const async = require('async');
const fs = require('fs');
const n = require('needle')
const he = require('he')
const Sequelize = require('sequelize')
const config = require('./config')

const sequelize = new Sequelize(config.db);

const News = sequelize.define('news', {
    title: { type: Sequelize.STRING, allowNull: false},
    description: { type: Sequelize.STRING(500), allowNull: false},
    cover: { type: Sequelize.STRING, allowNull: false},
    content: { type: Sequelize.TEXT, allowNull: false},
    link: { type: Sequelize.STRING, allowNull: false},
    host: { type: Sequelize.STRING, allowNull: false},
    author: { type: Sequelize.STRING, allowNull: false},
    //create_at: {type: Sequelize.STRING, allowNull: false}
},{
  timestamps: false,
  tableName: config.table
});

News.sync();

let list = []

const isToday = (d1,d2) => {
  let cha = d2.getTime() - d1.getTime()
  return cha < 24 * 60 * 60 * 1000 && cha > 0
}

const today = () => {
    let date = new Date();
    let seperator1 = "-";
    let seperator2 = ":";
    let month = date.getMonth() + 1;
    let strDate = date.getDate();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    let currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate
    return currentdate;
}

let q = async.queue(({item,index},callback) => {
  n.get(item.link, async(err,res,body) => {
    console.log(`index=>${index} url=>${item.link}`);
    const $ = cheerio.load(body);
    let cont = $('.newsText.fix').html()
    item['content'] = cont? he.decode(cont) : ''
    try{
      await News.create(item)
    }catch(e){console.log(e)}
    callback() 
  })
})

q.drain = () => {
  sequelize.close()
  console.log('All task finished')
}

let urls = [
    'http://cn.nikkei.com/industry/icar.html',
    'http://cn.nikkei.com/industry/itelectric-appliance.html',
    'http://cn.nikkei.com/industry/ienvironment.html',
    'http://cn.nikkei.com/industry/manufacturing.html',
    'http://cn.nikkei.com/industry/propertiesconstruction.html',
    'http://cn.nikkei.com/industry/tradingretail.html',
    'http://cn.nikkei.com/industry/scienceatechnology.html',
    'http://cn.nikkei.com/industry/management-strategy.html',
    'http://cn.nikkei.com/columnviewpoint/criticism.html',
    'http://cn.nikkei.com/columnviewpoint/kelongcolumn.html',
    'http://cn.nikkei.com/china/cpolicssociety.html'
]

const open = url => {
    return new Promise((resolve,reject) => {
        n.get(url,async(err,res,body) => {
            const $ = cheerio.load(body)
            let items = $('dt')
            for(let i = 0; i < items.length-1; i++){
                let date = items.eq(i).find('.date').html().replace(/[\(\)]/g,'')
                if(!isToday(new Date(date),new Date())){
                    continue 
                }
                let news = {}
                let title = items.eq(i).find('a').html()
                news['title'] = title? he.decode(title) : ''
               // console.log("title=>"+news.title)

                let description = items.eq(i).next().find('.content').html()
                news['description'] = description? he.decode(description) : ''
               // console.log("description=>"+news.description)

                news['author'] = 'nikkei'
                news['host'] = 'http://cn.nikkei.com/'

                let cover = $('dd').eq(i).find('.picture').find('img').attr('src')
                news['cover'] = cover? news.host+cover.substr(1) : ''
                news['link'] = news.host+items.eq(i).find('a').attr('href').substr(1)
                list.push(news)
            }

            resolve()
        })
    })
}

(async ()=>{
    for(let u in urls){
        await open(urls[u])
    }
    list.map((item,index) => {
        q.push({item,index})
    })
})()





