import{i as r}from"./index-f7lTt4hE.js";const o={create:async()=>(await r.post("/orders")).data,list:async({page:s=1,limit:e=20,signal:a}={})=>(await r.get("/orders",{params:{page:s,limit:e},signal:a})).data,get:async(s,{signal:e}={})=>(await r.get(`/orders/${s}`,{signal:e})).data,cancel:async s=>(await r.post(`/orders/${s}/cancel`)).data};export{o};
//# sourceMappingURL=orders-CAAgzGmO.js.map
