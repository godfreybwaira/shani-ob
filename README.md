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

1. `shani-fn`
2. `shani-target`
3. `shani-header`
4. `shani-plugin`
5. `shani-poll`
6. `shani-insert`
7. `shani-css`
8. `shani-mw`
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
<input type="search" shani-fn="r" shani-on="keyup|change" id="search" method="GET" action="/users/search" />
```
* The attribute `shani-on` accepts one or more valid javascript events separated
by `|` (pipe). This tells the browser to register events `keyup` and `change`
(in this case) on `input` element. If attribute `shani-on` was not specified, the default
`shani-on="change"` will be used (for all `input`, `select` and `textarea` elements).

* Attribute `shani-fn` has the value `r` which tells the browser to read data
from server using `GET` method. Other values for `shani-fn` includes `w`, `copy`,
`print` and `fs`. The descriptions about these values will be given later.

* The `method` attribute tells the browser to use HTTP `GET` request method to fetch data
using AJAX. You can use any request method including your custom request methods
supported by your server.

* The `action` attribute specifies the URL that will handle the request. Other attributes
that can be used instead of `action` attribute include `href` or `value` attribute.

Now consider the following HTML code:

```html
<div shani-watch="input#search" watch-on="change" shani-insert></div>
```

* The `div` element listens for `change` event on `input` element with id of `search`
so that whenever the result is returned by the browser is inserted to the `div`
element (replacing the existing content inside `div`).

## 1. Attributes
### 1.1 `shani-fn`

**Description:**

`shani-fn` or shani function is used to define a callback function for given event(s)

**Syntax:**

`shani-fn="value"` where `value` can be one of

* `r` (reading from server e.g: shani-fn="r")
* `w` (writing to server e.g: shani-fn="w")
* `print` (printing part of html document e.g: shani-fn="print" shani-target="selector")
* `fs` (full screen part of html document e.g: shani-fn="fs" shani-target="selector")
* `copy` (copy content of a document e.g: shani-fn="fs" shani-target="selector")

**Example:**

```html
<a shani-fn="r" shani-on="click" method="GET" href="/users/2/profile">View my Profile</a>
```

**Explanation:**

When a link is clicked, the callback `r` is called, triggering GET request to URL
specified by `href` attribute. The output is discarded. if you want the output then
use `shani-insert` attribute.


### 1.2 `shani-target`

**Description:**

`shani-target` is used to define a target element which will be affected by the
callback action. This atribute is used only when `shani-fn="print|fs|copy"`.

**Syntax:**

`shani-target="selector"` where `selector` can be any valid css selector.

**Example 1:**

```html
<button shani-fn="print" shani-target="div#page2">Print Page 2</button>
```
**Explanation:**

When a button is clicked, the callback `print` is called, triggering print dialog
box to print the content of `div#page2`.


**Example 2:**

```html
<button shani-fn="copy" shani-target="div#page2">Copy Page 2</button>
```
**Explanation:**

When a button is clicked, the callback `copy` is called, copying the content of
`div#page2` to clipboard.


**Example 3:**

```html
<button shani-fn="fs" shani-target="div#page2">View full Scrren</button>
```
**Explanation:**

When a button is clicked, the callback `fs` is called, triggering full screen
showing only the content of `div#page2`.


## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[GPL-3.0](https://choosealicense.com/licenses/gpl-3.0/)
