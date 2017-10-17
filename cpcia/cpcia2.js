const fs = require('fs')

const he = require('he')

const n = require('needle')

const async = require('async')

const cheerio = require('cheerio')

const Sequelize = require('sequelize')

const { db } = require('../config')

const { isToday } = require('../lib')

const sequelize = new Sequelize(`postgres://${db.username}:${db.password}@${db.host}:${db.port}/${db.dbname}`, { logging: false });

const News = sequelize.import('../model')

const url = 'http://www.cpcia.org.cn/html/16/news_page1.html'

let list = []

let q = async.queue((item,callback) => {  

    n.get(item.link, async(err,res,body) => {

        if(err){

          callback()

          return
          
        }

        const $ = cheerio.load(body, { lowerCaseTags: true })

        let time = $('.source').text()

        time = time? time.substring(time.lastIndexOf('：')+1,time.length) : ''



        if(!isToday(new Date(time),new Date())){

            callback()

            return

        }

        let cont = $(".content")

        cont = he.decode(cont.html().replace(/(&nbsp;)+/g, '')).replace(/<(p|div|span|table|a)\s*(\s+[^=]+=\s*"[^"]*")*\s*>/g, '<$1>')
                        .replace(/<(\/)?div>/g, '<$1p>').replace(/　+/g, '').replace(/<\/?(a|span)>/g, '')
                        .replace(/(<p>|<br\/?>)\s+/g, '$1').replace(/<p>\s*(<br\/?>\s*)*<\/p>\s*/g, '')

        item['content'] = cont? cont : ''

        console.log(item.content)

        await News.create(item)

        callback()  

    })      
})

q.drain = () =>{

    console.log('Done.')

    sequelize.close()

}

n.get(url, async(err,res,body) => {

    const $ = cheerio.load(body)

    let items = $('.page_list').find('ul').find('li')

    for(let i = 0; i < items.length; i++) {

        let item = {}

        let title = items.eq(i).find('a').html()

        item['title'] = title? he.decode(title) : "no title"

        let link = items.eq(i).find('a').attr('href')

        item['link'] = link? 'http://www.cpcia.org.cn'+link : "no link"

        item['author'] = 'cpcia'

        item['host'] = 'www.cpcia.org.cn'

        item['cover'] = ''

        item['description'] = ''

        list.push(item)

    }

    for (let c in list) {

        q.push(list[c])

    }
})