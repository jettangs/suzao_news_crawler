const fs = require('fs')

const he = require('he')

const n = require('needle')

const async = require('async')

const cheerio = require('cheerio')

const Sequelize = require('sequelize')

const { db } = require('./config')

const { isToday } = require('./lib')

const sequelize = new Sequelize(`postgres://${db.username}:${db.password}@${db.host}:${db.port}/${db.dbname}`, { logging: false });

const News = sequelize.import('./model')

const url = 'http://www.ccin.com.cn/ccin/2215/6554/index.shtml'

let options = {

    encoding: 'gb2312'

}

let collect = []

const q = async.queue((item, callback) => {

    console.log("Loading => " + item.link);

    n.get(item.link, async(err, res, body) => {

        if(err){

          callback()

          return

        }

        const $ = cheerio.load(body, { lowerCaseTags: true });

        let cont = $('.con')

        cont = cont.html()? he.decode(cont.html().replace(/(&nbsp;)+/g, '')).replace(/<(p|div|span|table|a)\s*(\s+[^=]+=\s*"[^"]*")*\s*>/g, '<$1>')
                        .replace(/<(\/)?div>/g, '<$1p>').replace(/　+/g, '').replace(/<\/?(a|span)>/g, '')
                        .replace(/(<p>|<br\/?>)\s+/g, '$1').replace(/<p>\s*(<br\/?>\s*)*<\/p>\s*/g, '') : ''

        item['content'] = cont

        await News.create(item)

        callback()

    })
})

q.drain = () => {

    sequelize.close()

    console.log('Done.')

}

n.get(url, (err, res, body) => {

    const $ = cheerio.load(body)

    let rows = $('.home_lb').find('li')

    for (let i in rows) {

        let date = '2017-' + rows.eq(i).find('span').html()

        if (!isToday(new Date(date), new Date())) {

            continue

        }

        let item = {}

        let title = rows.eq(i).find('a').html()

        item['title'] = title ? he.decode(title) : ''

        item['link'] = 'http://www.ccin.com.cn' + rows.eq(i).find('a').attr('href')

        item['author'] = 'ccin'

        item['host'] = 'www.ccin.com.cn'

        item['cover'] = ''
        
        item['description'] = ''
        
        //item['create_at'] = date

        collect.push(item)
    }

    for (let c in collect) {

        q.push(collect[c])

    }
})