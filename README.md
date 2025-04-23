# shani-ob

Shani on browser (shani-ob) is an open source javascript library that use html
attributes to interact with server via **WebSocket**, **AJAX** and **Server-Sent-Event**
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
12. Direct supports for JSON, XML, CSV and YAML


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
8. `shani-scheme`
9. `shani-watch`
10. `watch-on`
11. `shani-on`
12. `shani-log`
13. `watch-xss`

Other supported HTML attributes are:

1. `enctype`
2. `method`
3. `action`
4. `href`

Let us learn by examples. Look at the following `html` codes:

```html
<input type="search" shani-fn="r" shani-on="keyup|change" id="search" method="GET" action="/users/search" />
```

* The attribute `shani-on` accepts one or more valid JavaScript events separated by `|` (pipe). This tells the browser to register events `keyup` and `change` (in this case) on `input` element. If attribute `shani-on` was not specified, the default `shani-on="change"` will be used (for all `input`, `select` and `textarea` elements).

* Attribute `shani-fn` has the value `r` which tells the browser to read data from server using `GET` method. Other values for `shani-fn` includes `w`, `copy`, `print` and `fs`. The descriptions about these values will be given later.

* The main difference between `r` (read) and `w` (write) callbacks is that `r` uses 'GET' as default HTTP method while `w` uses 'POST' as default HTTP method. However, you can override HTTP method using `method` attribute on both callbacks.

* The `method` attribute tells the browser to use HTTP `GET` request method to fetch data using AJAX. You can use any request method including your custom request methods supported by your server.

* The `action` attribute specifies the URL that will handle the request. Other attributes that can be used instead of `action` attribute include `href` or `value` attribute.

Now consider the following HTML code:

```html
<div shani-watch="input#search" watch-on="change" shani-insert="replace"></div>
```

* The `div` element listens for `change` event on `input` element with id of `search` so that whenever the result is returned by the browser is inserted to the `div` element (replacing the existing content inside `div`).

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

When a link is clicked, the callback `r` is called, triggering GET request to URL specified by `href` attribute. The output is discarded. if you want to insert the output to the DOM then use `shani-insert` attribute.

### 1.2 `shani-target`

**Description:**

`shani-target` is used to define a target element which will be affected by the callback action. This attribute is used only when `shani-fn="print|fs|copy"`.

**Syntax:**

`shani-target="selector"` where `selector` can be any valid css selector.

**Example 1:**

```html
<button shani-fn="print" shani-target="div#page2">Print Page 2</button>
```
**Explanation:**

When a button is clicked, the callback `print` is called, triggering print dialog box to print the content of `div#page2`.

**Example 2:**

```html
<button shani-fn="copy" shani-target="div#page2">Copy Page 2</button>
```

**Explanation:**

When a button is clicked, the callback `copy` is called, copying the content of `div#page2` to clipboard.

**Example 3:**

```html
<button shani-fn="fs" shani-target="div#page2">View full Scrren</button>
```

**Explanation:**

When a button is clicked, the callback `fs` is called, triggering full screen showing only the content of `div#page2`.

### 1.3 `shani-header`

**Description:**

`shani-header` sends one or more HTTP headers to server. Any HTTP header including
custom headers can be send. Multiple headers are separated by `|` (pipe) while header key and value are separated by `:` (colon).

**Syntax:**

`shani-header="header-name1:header-value1[|header-name1:header-value1]"`

**Example:**

```html
<div shani-header="x-powered-by:shani-ob|accept:text/html" action="/users/3" shani-on="load" shani-fn="r" shani-insert="replace">Loading content, please wait...</div>
```

**Explanation:**

when page loaded send the headers `x-powered-by` and `accept` then get content from "/users/3" and insert into this `div`.

### 1.4 `shani-plugin`

**Description:**

`shani-plugin` invoke user defined JavaScript function when an event is fired by Shani object. User can listen to an event generated via `shani:plugin:pluginName` using `document` object and perform the required action. If parameters were given, these parameters will be available on `event.detail` object. Use a single space as a parameter separator, multiple plugins are separated by `|`.

**Syntax:**

`shani-plugin="event_or_statusCode:pluginName[:params_list][|event_or_statusCode:pluginName[:params_list]]"`

**Example:**

```html
<a href="/users" shani-plugin="404:toaster:color red" shani-fn="r">View All</a>
```

**Explanation:**

When a link is clicked and the HTTP status code `404` is returned, fire the event named
`shani:plugin:toaster`. The event object will contain `detail` object with object `{event: "plugin:toaster", params: "color red"}`. Note the space which was used to separate parameters. You can listen for this event using `document` object and act accordingly.

*Example:*
```js
document.addEventListener('shani:plugin:toaster', function(e){
	console.log(e.detail);
});
```


### 1.5 `shani-poll`

**Description:**

`shani-poll` used to create polling via AJAX to a remote server. It can be used to run callback given the defined duration in seconds. If you set `start` and `steps` but without `limit`, it will poll indefinitely.

**Syntax:**

`shani-poll="start[:steps[:limit]]"`

**Example:**

```html
<a href="/users/0/data" shani-poll="2:3:5" shani-fn="r">Click me</a>
```

**Explanation:**

When a link is clicked, after two seconds the data will be fetched from "/users/0/data" then after every three seconds the same action will be repeated for five times then it will stop.

### 1.6 `shani-insert`

**Description:**

`shani-insert` is used to insert content fetched from server to html page.

**Syntax:**

`shani-insert="before|after|remove|first|last|delete|replace"`

**Example 1: (Insert before this element)**

```html
<a href="/users/0/data" shani-fn="r" shani-insert="before">Insert before Me</a>
```

**Example 2: (Insert after this element)**

```html
<a href="/users/0/data" shani-fn="r" shani-insert="after">Insert after Me</a>
```

**Example 3: (Insert as a first child of this element)**

```html
<a href="/users/1" shani-fn="r" shani-insert="first">Insert before my first child</a>
```

**Example 4: (Insert as a last child of this element)**

```html
<a href="/users" shani-fn="r" shani-insert="last">Insert after my last child</a>
```

**Example 5: (Replace this element's content)**

```html
<a href="/users/3" shani-fn="r" shani-insert="replace">Replace my content</a>
```

**Example 6: (Delete this element)**

```html
<a href="/users/0/data" shani-fn="r" shani-insert="delete">Delete Me</a>
```

**Example 7: (Insert after this element then delete this element)**

```html
<a href="/users/0/data" shani-fn="r" shani-insert="remove">Insert after Me, then delete me</a>
```

### 1.7 `shani-css`

**Description:**

`shani-css` is used to manipulate CSS classes based on given event fired by an element or HTTP status code. You can use multiple callbacks separated by `|`

**Syntax:**

`shani-css="event_or_statusCode:[add|remove|replace|toggle]:[class1[ class2]]"`

**Example 1: (Adding classes to an element)**

```html
<a href="/users/3" shani-fn="r" shani-css="404:add:danger bold">Click me</a>
```

**Explanation:**

When HTTP status code `404` is returned, add CSS classes `danger` and `bold` to element `a`

**Example 2: (Removing classes from an element)**

```html
<a href="/users" shani-fn="r" shani-css="200:remove:danger bold">Click me</a>
```

**Explanation:**

When HTTP status code `200` is returned, remove CSS `danger` and `bold` classes
from element `a`

**Example 3: (Replace classes from element)**

```html
<a href="/users" shani-fn="r" shani-css="success:replace:danger alert">Click me</a>
```

**Explanation:**

When event `success` is fired by an element, replace it's `danger` class with `alert` class.

**Example 4: (Toggle classes on element)**

```html
<a href="/users/4" shani-fn="r" shani-css="400:toggle:danger alert">Click me</a>
```

**Explanation:**

When HTTP status code `400` is returned, toggle  `danger` and `alert` classes of element `a`

### 1.8 `shani-scheme`

**Description:**

In Shani-ob, all requests send by the browser via AJAX, if you want to establish web socket connection or server-sent-event ,use `shani-scheme` with values `ws` and `sse` respectively where `ws` refers to _web socket_ and `sse` is _server sent event_. Make sure your web server supports web socket or server sent event before using this feature.

**Syntax:**

`shani-scheme="ws|sse"`

**Example 1: (Using web socket)**

```html
<a href="/users/0/data" shani-fn="r" shani-scheme="ws">Click me</a>
```

**Explanation:**

Establish a web socket connection to `ws://[yourhost]/users/0/data` when a link is clicked.

**Example 2: (Using server-sent-event)**

```html
<a href="/users/0/data" shani-fn="r" shani-scheme="sse">Click me</a>
```

**Explanation:**

When a link is clicked, establish server-sent-event connection to `[yourhost]/users/0/data`.
The default scheme used here is the current scheme used by web browser (either HTTP or HTTPS)

### 1.9 `shani-watch`

**Description:**

`shani-watch` attribute is used to watch for events fired by another HTML element then perform required action. One element fire event, another element react to that event. You can watch one or more elements separated by comma.

**Syntax:**

`shani-watch="selector[,selector]"`

**Example:**

```html
<div class="container" shani-watch="#profile" watch-on="click"></div>
```

**Explanation:**

This `div.container` watches for an element with id `profile` when it is clicked. You can omit `watch-on` attribute to watch for an element as soon as it is created.

### 1.10 `watch-on`

**Description:**

`watch-on` attribute is used to define watching events fired by element or HTTP status codes. It is used along side with `shani-watch` attribute.

Some built-in events have direct meaning, such as:

1. `ready` fired when server returns response
2. `abort` fired when connection to server is cancelled by client
3. `error` fired when client fails to connect to server
4. `timeout` fired when connection to server timed out
5. `loadstart` fired when client successfully establish connection to server
6. `end` fired when server finished to send data to client
7. `progress` fired when server is processing the client request (e.g: during file upload)
8. `init` fired when shani object is created
9. `copy` fired when page content is copied
10. `load` fired when the page loads
11. `demand` fired when the element is visible to the DOM

**Syntax:**

`watch-on="eventName_or_statusCode[|eventName_or_statusCode]"`

**Example:**

```html
<div class="container" shani-watch="#profile" watch-on="click"></div>
```

**Explanation:**

This `div.container` watches for an element with id `profile` when it is clicked. If you omit `watch-on` attribute the default value will be `watch-on="init"`.

### 1.11 `shani-on`

**Description:**

`shani-on` attribute is used to define events fired by element. It is used alongside with `shani-fn` attribute. There are default events for some elements as follows:

* `submit` for form elements
* `change` for input, select and textarea elements
* `click` for all other elements

You can attach one or more events to listen on a single element. If you omit this attribute the defaults will me assumed.

**Syntax:**

`shani-on="eventName_or_statusCode[|eventName_or_statusCode]"`

**Example:**

```html
<a class="button" shani-fn="r" shani-on="click" href="/users/0/profile"></a>
```

**Explanation:**

This `div.container` watches for an element with id `profile` when it is clicked. If you omit `watch-on` attribute the default value will be `watch-on="init"`.

### 1.12 `shani-log`

**Description:**

`shani-log` attribute is used to display on console the request and response data as well as response headers coming from server. This attribute is handy only for debugging purpose.

**Syntax:**

`shani-log="[true|false]"`

**Example:**

```html
<form method="POST" enctype="application/json" shani-log="true" shani-fn="w" action="/handler/form"></form>
```

**Explanation:**

When set to true, the raw request data will be printed on console.

### 1.13 `watch-xss`

**Description:**

`watch-xss` attribute is used to prevent response content from being injected into the DOM as HTML markups. This is important to prevent XSS attack. This attribute is only available with watcher elements (Elements with `shani-watch` attributes).

**Syntax:**

`watch-xss="[true|false]"`

**Example:**

```html
<div shani-watch="#form" watch-on="200" watch-xss="true">Waiting for server response</div>
```

**Explanation:**

When set to true, the server response will be inserted into the `div` as plain text, otherwise the default behavior is assumed. The default behavior is to check for HTTP `content-type` header and to decide how to handle contents from server. If the `content-type` is `html` then HTML content will be injected as HTML markup, otherwise content will be injected as plain texts.

## Tips

* To disable any element use `disable` attribute of the HTML
* You can listen to all events using `*` eg: `watch-on="*"`

## Sending JSON, XML, CSV or YAML

You can directly send JSON, XML, CSV or YAML to server using `shani-ob`.
This can be achieved through enctype attribute or `shani-header="content-type:[your/type]"`
where [your/type] can be any of `application/json`, `text/yaml`, `application/xml` or
`text/csv` depending what type your server supports. Look at the following example:

```html
<form method="POST" enctype="application/json" shani-on="submit" shani-fn="w" action="/handler/form"></form>
```
**Explanation:**

The form above will be sent to `/handler/form` using POST HTTP method as `application/json`.

Mind you that this current version of `shani-ob` does not support sending file as JSON.

## Shanifying your HTML

You can programatically apply `Shanify` global method to any element on page.

**Syntax:**

```js
window.Shanify(HTMLElement|string nodes_or_selector, object shaniAttributes, bool applyToSelf = false);
```

**Example:**

```js
Shanify('.page', {
    'shani-fn':'r',
    'shani-on':'click|keyup',
    'href':'/content/2/page'
}, false);
```

**Explanation:**

`nodes_or_selector` can be of type string or `HTMLElement`, if it is `string` then it must be valid CSS selector. `shaniAttributes` must be object of supported Shani attributes alongside with their values. When `applyToSelf` is set to true, then `nodes_or_selector` will be shanified, else it's children will be shanified.

## Redirection

Shani supports request redirection in two ways:
1. Ajax redirection via response header `x-ajax` set to `1`
2. Normal HTTP redirection

Both types of redirection must supported by server through response header `location` and HTTP status code `300 <= status code < 400.

If `x-ajax` response header is not provided, then the redirection is handled normally. When this happens and the request URL is `#` then self page refresh is performed, i.e `history.go(0)`, otherwise the redirection is done following the URL.

If `x-ajax` response header is provided, server can also add additional header that are supported by Shani. These headers MUST be valid Shani attributes mentioned under **Usage** section.
## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[GPL-3.0](https://choosealicense.com/licenses/gpl-3.0/)
