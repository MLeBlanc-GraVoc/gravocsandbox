let subscribers = {};

function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }

  subscribers[eventName] = [...subscribers[eventName], callback];

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter((cb) => {
      return cb !== callback;
    });
  };
}

function publish(eventName, data) {
  let eventData = { ...data };

  if (eventName === PUB_SUB_EVENTS.cartUpdate) {
    if (data.source === 'product-form') {
      eventName = PUB_SUB_EVENTS.cartAdd;
    } else if (data.source === 'cart-items' && !data.variantId) {
      eventName = PUB_SUB_EVENTS.cartRemove;
    }
  }

  if (eventName === PUB_SUB_EVENTS.variantChange) {
    eventData =  { ...eventData.data };
    delete eventData.html;
  }

  if (eventName === PUB_SUB_EVENTS.cartAdd) {
    eventData.variantId = eventData.productVariantId;
    delete eventData.productVariantId;
  }

  // Remove the 'source' node from eventData
  delete eventData.source;

  // Broadcast the event with modified eventData
  document.dispatchEvent(new CustomEvent(eventName, {
    detail: eventData
  }));

  if (subscribers[eventName]) {
    subscribers[eventName].forEach((callback) => {
      callback(data);
    });
  }
}
