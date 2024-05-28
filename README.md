# shani-ob
Shani on browser (shani-ob) is an open source javascript library that use html attributes to interact with server via **WebSocket**, **AJAX** and **Server-Sent-Event**
using the idea of HATEOAS (Hypermedia as the engine of application state).

## Main Features
1. Support all major browsers
2. Uses available HTML attributes and custom attributes to interact with the server
3. Supports custom HTTP methods for REST application
4. Zero dependency
5. Web Socket support
6. Server Sent Event (SSE) support
7. AJAX support
8. Custom Events support
9. Event Synchronization
10. 3rd part extensions and library support
11. Framework agnostic


## Installation

```html
<script defer src="https://github.com/godfreybwaira/shani-ob/shani-ob.min.js"></script>
```
## Usage

**Shani-ob** has the following attributes:

1. `shani-mw`
2. `shani-target`
3. `shani-header`
4. `shani-plugin`
5. `shani-poll`
6. `shani-insert`
7. `shani-css`
8. `shani-fn`
9. `shani-scheme`
10. `shani-watch`
11. `watch-on`

Other supported HTML attributes are:

1. `enctype`
2. `method`
3. `action`
4. `href`

Let us learn by examples. Look at the following `html` codes:

```html
<input type="search" shani-on="keyup|change" id="search" method="GET" action="/users/search" />
```
* The attribute `shani-on` accepts one or more valid javascript events separated by `|` (pipe).
This tells the browser to register events `keyup` and `change` (in this case) on `input` element.

* The `method` attribute tells the browser to use HTTP `GET` request method to fetch data
using AJAX. You can use any request method including your custom request methods
supported by your server.

* The `action` attribute specifies the URL that will handle the request. Other attributes
that can be used instead of `action` attribute include `href` or `value` attribute.

Now consider the following HTML code:

```html
<div shani-watch="input#search" watch-on="change" shani-insert="replace"></div>
```

* The `div` element listens for `change` event on `input` element with id of `search`
so that whenever the result is returned by the browser it is inserted to the
`div` element (replacing the existing content inside `div`).

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[GPL-3.0](https://choosealicense.com/licenses/gpl-3.0/)
