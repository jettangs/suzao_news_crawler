module.exports = (sequelize, DataTypes) => {
    return sequelize.define('news', {
        title: { type: DataTypes.STRING, allowNull: false},
        description: { type: DataTypes.STRING(500), allowNull: false},
        cover: { type: DataTypes.STRING, allowNull: false},
        content: { type: DataTypes.TEXT, allowNull: false},
        link: { type: DataTypes.STRING, allowNull: false},
        host: { type: DataTypes.STRING, allowNull: false},
        author: { type: DataTypes.STRING, allowNull: false}
    }, {
        timestamps: false,
        tableName: 'sz_news_gather'
    });
};