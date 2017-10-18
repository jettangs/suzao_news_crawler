const fs = require('fs')

const he = require('he')

const n = require('needle')

const async = require('async')

const cheerio = require('cheerio')

const Sequelize = require('sequelize')

const { db } = require('./config')

const { isToday, contains, today } = require('./lib')

const sequelize = new Sequelize(`postgres://${db.username}:${db.password}@${db.host}:${db.port}/${db.dbname}`, { logging: false });

const News = sequelize.import('./model')

let list = []

const q = async.queue(({ item, index }, callback) => {

    n.get(item.link, async(err, res, body) => {

        if(err){

          callback()

          return

        }

        console.log(`Loaded ${index} => ${item.link}`)

        const $ = cheerio.load(body)

        let date = $('.meta-item__text').html()

        if (!isToday(new Date(date), new Date())) {

            callback()

            return

        }

        item['create_at'] = date

        let cont = $('.node-article-content')

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

    console.log('All task finished')

}

let urls = [
    'https://wallstreetcn.com/news/global',
    'https://wallstreetcn.com/news/shares',
    'https://wallstreetcn.com/news/bonds',
    'https://wallstreetcn.com/news/commodities',
    'https://wallstreetcn.com/news/forex',
    'https://wallstreetcn.com/news/enterprise',
    'https://wallstreetcn.com/news/economy',
    'https://wallstreetcn.com/news/charts',
    'https://wallstreetcn.com/news/china',
    'https://wallstreetcn.com/news/us'
]

const open = url => {

    return new Promise((resolve, reject) => {

        n.get(url, async(err, res, body) => {

            const $ = cheerio.load(body)

            let json = $('script').html().replace(/[\n\t\ ]/g, '')

            json = json.substring('window.__INITIAL_COMPONENTS_STATE__ = '.length - 2, json.indexOf('window.__INITIAL_VUEX_STATE__'))

            let items = JSON.parse(json)[1]['articles']

            for (let i = 0; i < items.length; i++) {

                let news = {}

                let title = items[i].title

                news['title'] = title ? title : ''

                if (contains(list, news.title)) {

                    continue

                }

                let description = items[i].content_short

                news['description'] = description ? description : ''

                news['author'] = 'wallstreetcn'

                news['host'] = 'https://wallstreetcn.com'

                news['cover'] = items[i].image_uri + '?imageView2/1/w/373/h/280'

                news['link'] = items[i].uri

                if (news.link.indexOf('wallstreetcn') < 0) {

                    continue

                }

                if (news.link.indexOf('premium') > 0) {

                    continue

                }

                list.push(news)

            }

            resolve()

        })
    })
}

(async() => {

    for (let u in urls) {

        await open(urls[u])

    }

    list.map((item, index) => {

        q.push({ item, index })

    })

})()