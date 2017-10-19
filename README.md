# dbpedia-soccer-extractor

This repository can be used to extract soccer players and soccer club information from dbpedia.

## Prerequisites

You need to have nodejs and npm installed. And you need a internet connection. ;)

## Execution

```sh
npm install

npm run extract:clubs
npm run extract:players

# players are filtered by the clubs extracted earlier
npm run filter:players

# assign players to their clubs so you get [{ name: 'FC Bayern Munich', players: [{ name: 'Manuel Neuer' }]}]
npm run merge

# maps the result and generates xml file from that
npm run map:xml
```


Enjoy!