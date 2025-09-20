(()=>{var me=Object.defineProperty;var ne=Object.getOwnPropertySymbols;var he=Object.prototype.hasOwnProperty,ge=Object.prototype.propertyIsEnumerable;var oe=(e,t,n)=>t in e?me(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,w=(e,t)=>{for(var n in t||(t={}))he.call(t,n)&&oe(e,n,t[n]);if(ne)for(var n of ne(t))ge.call(t,n)&&oe(e,n,t[n]);return e};var N=(e,t,n)=>new Promise((a,r)=>{var i=o=>{try{c(n.next(o))}catch(p){r(p)}},d=o=>{try{c(n.throw(o))}catch(p){r(p)}},c=o=>o.done?a(o.value):Promise.resolve(o.value).then(i,d);c((n=n.apply(e,t)).next())});function R(e){if(e==null||typeof e!="object")return!1;let t=Object.getPrototypeOf(e);return t==null||t===Object.prototype}function k(e){return e!=null&&e.kind===3}var F="__current",G={},Te=[];function J(e,{strict:t=!0,components:n}={}){let a=0,r={strict:t,mounted:!1,channel:e,children:Te,nodes:new WeakSet,parents:new WeakMap,tops:new WeakMap,components:new WeakMap,fragments:new WeakMap};t&&Object.freeze(n);let i={kind:0,options:t?Object.freeze({strict:t,components:n}):{strict:t,components:n},get children(){return r.children},createComponent(d,...c){if(n&&n.indexOf(d)<0)throw new Error(`Unsupported component: ${d}`);let[o,p,...s]=c,m=o!=null?o:{},h=[],C={};if(o)for(let l of Object.keys(o))l!=="children"&&(C[l]=P(le(o[l])));if(p)if(Array.isArray(p))for(let l of p)h.push(x(l,i));else{h.push(x(p,i));for(let l of s)h.push(x(l,i))}let b=`${a++}`,g={externalProps:t?Object.freeze(m):m,internalProps:C,children:t?Object.freeze(h):h},f=w({kind:1,get children(){return g.children},get props(){return g.externalProps},get remoteProps(){return g.internalProps},remove:()=>ae(f),updateProps:l=>Oe(f,l,g,r),append:(...l)=>z(f,l.map(u=>x(u,i)),g,r),appendChild:l=>q(f,x(l,i),g,r),removeChild:l=>H(f,l,g,r),replaceChildren:(...l)=>W(f,l.map(u=>x(u,i)),g,r),insertBefore:(l,u)=>D(f,x(l,i),u,g,r),insertChildBefore:(l,u)=>D(f,x(l,i),u,g,r)},G);r.components.set(f,g),Object.defineProperty(f,"type",{value:d,configurable:!1,writable:!1,enumerable:!0}),K(f,r),Y(f,b,i);for(let l of g.children)_(f,l,r);return f},createText(d=""){let c=`${a++}`,o={text:d},p=m=>be(s,m,o,r),s=w({kind:2,get text(){return o.text},update:p,updateText:p,remove:()=>ae(s)},G);return K(s,r),Y(s,c,i),s},createFragment(){let d=`${a++}`,c={children:t?Object.freeze([]):[]},o=w({kind:3,get children(){return c.children},append:(...p)=>z(o,p.map(s=>x(s,i)),c,r),appendChild:p=>q(o,x(p,i),c,r),removeChild:p=>H(o,p,c,r),replaceChildren:(...p)=>W(o,p.map(s=>x(s,i)),c,r),insertBefore:(p,s)=>D(o,x(p,i),s,c,r),insertChildBefore:(p,s)=>D(o,x(p,i),s,c,r)},G);return r.fragments.set(o,c),K(o,r),Y(o,d,i),o},append:(...d)=>z(i,d.map(c=>x(c,i)),r,r),appendChild:d=>q(i,x(d,i),r,r),replaceChildren:(...d)=>W(i,d.map(c=>x(c,i)),r,r),removeChild:d=>H(i,d,r,r),insertBefore:(d,c)=>D(i,x(d,i),c,r,r),insertChildBefore:(d,c)=>D(i,x(d,i),c,r,r),mount(){return r.mounted?Promise.resolve():(r.mounted=!0,Promise.resolve(e(0,r.children.map($))))}};return i}function Ce(e,{tops:t}){var n;return((n=t.get(e))===null||n===void 0?void 0:n.kind)===0}function pe(e,t){let n=a=>{if("children"in a)for(let r of a.children)t(r),n(r)};n(e)}function M(e,t,{remote:n,local:a}){let{mounted:r,channel:i}=t;r&&(e.kind===0||Ce(e,t))&&n(i),a()}function be(e,t,n,a){return M(e,a,{remote:r=>r(3,e.id,t),local:()=>{n.text=t}})}var E=Symbol("ignore");function Oe(e,t,n,a){let{strict:r}=a,{internalProps:i,externalProps:d}=n,c={},o=[],p=!1;for(let s of Object.keys(t)){if(s==="children")continue;let m=d[s],h=t[s],C=i[s],b=le(h);if(C===b&&(b==null||typeof b!="object"))continue;let[g,f]=X(C,b);f&&o.push(...f),g!==E&&(p=!0,c[s]=g,k(m)&&Q(m,a),k(h)&&_(e,h,a))}return M(e,a,{remote:s=>{p&&s(4,e.id,c)},local:()=>{let s=w(w({},d),t);n.externalProps=r?Object.freeze(s):s,n.internalProps=w(w({},n.internalProps),c);for(let[m,h]of o)m[F]=h}})}function X(e,t,n=new Set){return n.has(e)?[E]:typeof e=="function"&&F in e?(n.add(e),[typeof t=="function"?E:P(t),[[e,t]]]):Array.isArray(e)?(n.add(e),Ee(e,t,n)):R(e)&&!k(e)?(n.add(e),ke(e,t,n)):[e===t?E:t]}function P(e,t=new Map){let n=t.get(e);if(n)return n;if(k(e))return t.set(e,e),e;if(Array.isArray(e)){let a=[];t.set(e,a);for(let r of e)a.push(P(r,t));return a}if(R(e)){let a={};t.set(e,a);for(let r of Object.keys(e))a[r]=P(e[r],t);return a}if(typeof e=="function"){let a=(...r)=>a[F](...r);return Object.defineProperty(a,F,{enumerable:!1,configurable:!1,writable:!0,value:e}),t.set(e,a),a}return e}function S(e,t=new Set){if(!t.has(e)){if(t.add(e),Array.isArray(e))return e.reduce((n,a)=>{let r=S(a,t);return r?[...n,...r]:n},[]);if(R(e))return Object.keys(e).reduce((n,a)=>{let r=S(e[a],t);return r?[...n,...r]:n},[]);if(typeof e=="function")return F in e?[e]:void 0}}function ae(e){var t;(t=e.parent)===null||t===void 0||t.removeChild(e)}function z(e,t,n,a){for(let r of t)q(e,r,n,a)}function q(e,t,n,a){var r;let{nodes:i,strict:d}=a;if(!i.has(t))throw new Error("Cannot append a node that was not created by this remote root");let c=t.parent,o=(r=c==null?void 0:c.children.indexOf(t))!==null&&r!==void 0?r:-1;return M(e,a,{remote:p=>{p(1,e.id,o<0?e.children.length:e.children.length-1,$(t),c?c.id:!1)},local:()=>{_(e,t,a);let p;if(c){let s=fe(c,a),m=[...s.children];m.splice(o,1),c===e?p=m:(s.children=d?Object.freeze(m):m,p=[...n.children])}else p=[...n.children];p.push(t),n.children=d?Object.freeze(p):p}})}function W(e,t,n,a){for(let r of e.children)H(e,r,n,a);z(e,t,n,a)}function H(e,t,n,a){let{strict:r}=a,i=e.children.indexOf(t);if(i!==-1)return M(e,a,{remote:d=>d(2,e.id,i),local:()=>{Q(t,a);let d=[...n.children];d.splice(d.indexOf(t),1),n.children=r?Object.freeze(d):d}})}function D(e,t,n,a,r){var i;let{strict:d,nodes:c}=r;if(!c.has(t))throw new Error("Cannot insert a node that was not created by this remote root");let o=t.parent,p=(i=o==null?void 0:o.children.indexOf(t))!==null&&i!==void 0?i:-1;return M(e,r,{remote:s=>{let m=n==null?e.children.length-1:e.children.indexOf(n);s(1,e.id,m<p||p<0?m:m-1,$(t),o?o.id:!1)},local:()=>{_(e,t,r);let s;if(o){let m=fe(o,r),h=[...m.children];h.splice(p,1),o===e?s=h:(m.children=d?Object.freeze(h):h,s=[...a.children])}else s=[...a.children];n==null?s.push(t):s.splice(s.indexOf(n),0,t),a.children=d?Object.freeze(s):s}})}function x(e,t){return typeof e=="string"?t.createText(e):e}function _(e,t,n){let{tops:a,parents:r}=n,i=e.kind===0?e:a.get(e);a.set(t,i),r.set(t,e),se(t,n),pe(t,d=>{a.set(d,i),se(d,n)})}function se(e,t){if(e.kind!==1)return;let n=e.props;n&&Object.values(n).forEach(a=>{k(a)&&_(e,a,t)})}function Q(e,t){let{tops:n,parents:a}=t;n.delete(e),a.delete(e),pe(e,r=>{n.delete(r),ce(r,t)}),ce(e,t)}function ce(e,t){if(e.kind!==1)return;let n=e.remoteProps;for(let a of Object.keys(n!=null?n:{})){let r=n[a];k(r)&&Q(r,t)}}function K(e,{parents:t,tops:n,nodes:a}){a.add(e),Object.defineProperty(e,"parent",{get(){return t.get(e)},configurable:!0,enumerable:!0}),Object.defineProperty(e,"top",{get(){return n.get(e)},configurable:!0,enumerable:!0})}function $(e){return e.kind===2?{id:e.id,kind:e.kind,text:e.text}:{id:e.id,kind:e.kind,type:e.type,props:e.remoteProps,children:e.children.map(t=>$(t))}}function le(e){return k(e)?we(e):e}function we(e){return{id:e.id,kind:e.kind,get children(){return e.children.map(t=>$(t))}}}function fe(e,t){return e.kind===0?t:e.kind===3?t.fragments.get(e):t.components.get(e)}function Y(e,t,n){Object.defineProperty(e,"id",{value:t,configurable:!0,writable:!1,enumerable:!1}),Object.defineProperty(e,"root",{value:n,configurable:!0,writable:!1,enumerable:!1})}function ke(e,t,n){if(!R(t)){var a;return[P(t),(a=S(e))===null||a===void 0?void 0:a.map(c=>[c,void 0])]}let r=!1,i=[],d={};for(let c in e){let o=e[c];if(!(c in t)){r=!0;let h=S(o);h&&i.push(...h.map(C=>[C,void 0]))}let p=t[c],[s,m]=X(o,p,n);m&&i.push(...m),s!==E&&(r=!0,d[c]=s)}for(let c in t)c in d||(r=!0,d[c]=P(t[c]));return[r?d:E,i]}function Ee(e,t,n){if(!Array.isArray(t)){var a;return[P(t),(a=S(e))===null||a===void 0?void 0:a.map(s=>[s,void 0])]}let r=!1,i=[],d=t.length,c=e.length,o=Math.max(c,d),p=[];for(let s=0;s<o;s++){let m=e[s],h=t[s];if(s<d){if(s>=c){r=!0,p[s]=P(h);continue}let[C,b]=X(m,h,n);if(b&&i.push(...b),C===E){p[s]=m;continue}r=!0,p[s]=C}else{r=!0;let C=S(m);C&&i.push(...C.map(b=>[b,void 0]))}}return[r?p:E,i]}function ue(){return(t,n)=>{var a;function r(...i){return N(this,null,function*(){if(i.length===1)return n(...i);let[{channel:d,components:c},o]=i,p=J(d,{components:c,strict:!0}),s=n(p,o);return typeof s=="object"&&s!=null&&"then"in s&&(s=yield s),p.mount(),s})}return(a=globalThis.shopify)===null||a===void 0||a.extend(t,r),r}}var Z=ue();var V="AdminAction";var j="Banner";var I="BlockStack";var v="Button";var ee="InlineStack";var te="Select";var B="Text";var A="TextArea";var Pe="admin.product-details.action.render",Tt=Z(Pe,(e,{i18n:t,close:n,data:a})=>{let r=!1,i=null,d=[],c="",o={fabricMaterial:"",occasionUse:"",targetAudience:"",keyFeatures:"",additionalNotes:""},p="",s="";console.log("Thunder Text Extension: Starting extension"),Promise.all([m(),h()]).then(()=>{g()}).catch(f=>{console.error("Failed to load initial data:",f),s="Failed to load product or template data",g()});function m(){return N(this,null,function*(){try{let l={query:`
          query GetProduct($id: ID!) {
            product(id: $id) {
              id
              title
              descriptionHtml
              images(first: 10) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    title
                    price
                  }
                }
              }
              tags
              productType
              vendor
            }
          }
        `,variables:{id:a.selected[0].id}},u=yield fetch("shopify:admin/api/graphql.json",{method:"POST",body:JSON.stringify(l)});if(!u.ok)throw new Error("Failed to fetch product data");let T=yield u.json();i={id:T.data.product.id,title:T.data.product.title,description:T.data.product.descriptionHtml,images:T.data.product.images.edges.map(y=>y.node),variants:T.data.product.variants.edges.map(y=>y.node),tags:T.data.product.tags,productType:T.data.product.productType,vendor:T.data.product.vendor}}catch(f){throw console.error("Failed to load product data:",f),f}})}function h(){return N(this,null,function*(){var f,l,u;try{let y=yield fetch("shopify:admin/api/graphql.json",{method:"POST",body:JSON.stringify({query:`
          query GetAppMetafields {
            app {
              metafields(first: 10, namespace: "thunder_text") {
                edges {
                  node {
                    id
                    namespace
                    key
                    value
                  }
                }
              }
            }
          }
        `})});if(y.ok){let O=yield y.json();console.log("Thunder Text Extension: GraphQL response:",O);let re=(((u=(l=(f=O.data)==null?void 0:f.app)==null?void 0:l.metafields)==null?void 0:u.edges)||[]).find(U=>U.node.key==="templates");if(re)try{d=JSON.parse(re.node.value).templates||[],d.length>0&&(c=d[0].id),console.log("Thunder Text Extension: Loaded",d.length,"templates from app metafields");return}catch(U){console.error("Failed to parse template data from metafields:",U)}}}catch(T){console.error("Failed to load templates via GraphQL:",T)}console.log("Thunder Text Extension: Using real template data from Thunder Text settings"),d=[{id:"df9f8b4b-0930-49b3-8d57-495f71a4661d",name:"General Products Template",category:"general",isDefault:!0},{id:"ec83500d-d5dd-4f37-a928-6c6b97f74f3f",name:"Jewelry & Accessories Template",category:"jewelry_accessories",isDefault:!0},{id:"2e47c122-d2e8-4bd1-b1dd-10650cb47b01",name:"Women's Clothing Template",category:"womens_clothing",isDefault:!0}],d.length>0&&(c=(d.find(y=>y.category==="womens_clothing")||d[0]).id)})}function C(){return N(this,null,function*(){if(!i||!c){s="Missing product data or template selection",g();return}r=!0,s="",g();try{let f=d.find(O=>O.id===c),l=f?f.name:"General";yield new Promise(O=>setTimeout(O,2e3));let u;(f==null?void 0:f.category)==="womens_clothing"?u=`
<h2>${i.title}</h2>

<p>Step into effortless style with this ${i.title}. Designed for the modern woman who values both comfort and sophistication.</p>

<h3>Product Details</h3>
<p>This piece features ${o.fabricMaterial||"premium materials"} that feel luxurious against your skin. The thoughtful design ensures a flattering fit that moves with you throughout your day.</p>

<h3>Styling Tips</h3>
<p>Perfect for ${o.occasionUse||"versatile styling options"}. Dress it down with your favorite denim or elevate it with accessories for evening occasions.</p>

<h3>Who It's For</h3>
<p>Designed for ${o.targetAudience||"confident women who appreciate quality"}.</p>

<h3>Key Features</h3>
<ul>
${o.keyFeatures?`<li>${o.keyFeatures}</li>`:"<li>Premium fabric construction</li>"}
<li>Comfortable, flattering fit</li>
<li>Versatile styling options</li>
</ul>

${o.additionalNotes?`<p><strong>Special Details:</strong> ${o.additionalNotes}</p>`:""}

<p><strong>Why You'll Love It:</strong> This ${i.title} combines timeless style with modern comfort, making it an essential addition to your wardrobe.</p>
        `.trim():(f==null?void 0:f.category)==="jewelry_accessories"?u=`
<h2>${i.title}</h2>

<p>Elevate your style with this stunning ${i.title}. A perfect blend of craftsmanship and elegance that speaks to your unique taste.</p>

<h3>Craftsmanship Details</h3>
<p>Expertly crafted with ${o.fabricMaterial||"premium materials"}, this piece showcases exceptional attention to detail and quality construction.</p>

<h3>Styling Occasions</h3>
<p>Ideal for ${o.occasionUse||"both everyday wear and special occasions"}. Whether you're dressing for work or play, this piece adds the perfect finishing touch.</p>

<h3>Perfect For</h3>
<p>${o.targetAudience||"Those who appreciate fine jewelry and accessories"}.</p>

<h3>Key Features</h3>
<ul>
${o.keyFeatures?`<li>${o.keyFeatures}</li>`:"<li>Premium craftsmanship</li>"}
<li>Timeless design</li>
<li>Versatile styling options</li>
</ul>

${o.additionalNotes?`<p><strong>Care Notes:</strong> ${o.additionalNotes}</p>`:""}

<p><strong>Why It's Special:</strong> This ${i.title} is more than an accessory\u2014it's an expression of your personal style and attention to quality.</p>
        `.trim():u=`
<h2>${i.title}</h2>

<p>Discover the exceptional quality and functionality of this ${i.title}. Designed to exceed expectations and deliver lasting value.</p>

<h3>Key Features</h3>
<ul>
${o.keyFeatures?`<li>${o.keyFeatures}</li>`:"<li>Premium quality construction</li>"}
${o.fabricMaterial?`<li>Made with ${o.fabricMaterial}</li>`:"<li>Durable, high-quality materials</li>"}
<li>Designed for ${o.targetAudience||"modern lifestyle needs"}</li>
</ul>

<h3>Usage and Applications</h3>
<p>Perfect for ${o.occasionUse||"versatile everyday use"}. Whether you need reliable performance or standout quality, this product delivers on all fronts.</p>

<h3>Specifications and Care</h3>
<p>Built to last with attention to every detail. ${o.additionalNotes||"Easy to use and maintain for long-lasting satisfaction."}</p>

<p><strong>Value Proposition:</strong> Choose this ${i.title} for its perfect combination of quality, functionality, and value that makes it the right choice for your needs.</p>
        `.trim(),p=u;return}catch(f){console.error("Generation failed:",f),s=f.message||"Failed to generate description. Please try again."}finally{r=!1,g()}})}function b(){return N(this,null,function*(){if(!(!p||!i))try{let f={query:`
          mutation UpdateProductDescription($input: ProductInput!) {
            productUpdate(input: $input) {
              product {
                id
                descriptionHtml
              }
              userErrors {
                field
                message
              }
            }
          }
        `,variables:{input:{id:i.id,descriptionHtml:p}}},l=yield fetch("shopify:admin/api/graphql.json",{method:"POST",body:JSON.stringify(f)});if(l.ok){let u=yield l.json();if(u.data.productUpdate.userErrors.length===0)console.log("Product description updated successfully"),n();else throw new Error(u.data.productUpdate.userErrors[0].message)}}catch(f){console.error("Failed to update product:",f),s="Failed to update product description. Please try again.",g()}})}function g(){for(console.log("Thunder Text Extension: Building UI (single render approach)");e.firstChild;)e.removeChild(e.firstChild);let f=e.createComponent(I,{gap:"base"});if(s&&f.append(e.createComponent(j,{tone:"critical"},e.createText(s))),i){let l=`Product: ${i.title}
Type: ${i.productType}
Images: ${i.images.length} available`;f.append(e.createComponent(j,{tone:"info"},e.createText(l)))}if(!r&&!p){let l=e.createComponent(I,{gap:"base"});if(d.length>0){let u=d.find(y=>y.id===c);l.append(e.createComponent(B,{variant:"headingMd",tone:"base"},"Product Category Template"));let T=e.createComponent(te,{label:"Choose a template that best matches your product type",options:d.map(y=>({value:y.id,label:`${y.name}${y.category?` - ${y.category}`:""}`})),value:c,onChange:y=>{c=y,g()}});l.append(T),u&&l.append(e.createComponent(I,{gap:"tight"},[e.createComponent(B,{variant:"bodyMd",tone:"subdued"},`Selected: ${u.name} Template`),e.createComponent(B,{variant:"bodySm",tone:"subdued"},u.description||`This template will structure your product description optimized for ${u.category||"your product type"}.`)]))}else l.append(e.createComponent(j,{tone:"warning"},e.createText("No templates available. Please configure templates in the main Thunder Text app.")));l.append(e.createComponent(A,{label:"Fabric/Material Content",placeholder:"e.g. 100% organic cotton, stainless steel, recycled plastic",helpText:"Describe the materials used in this product",value:o.fabricMaterial,onChange:u=>{o.fabricMaterial=u}})),l.append(e.createComponent(A,{label:"Occasion Use",placeholder:"e.g. outdoor activities, formal events, everyday use",helpText:"When or where would customers use this product?",value:o.occasionUse,onChange:u=>{o.occasionUse=u}})),l.append(e.createComponent(A,{label:"Target Audience",placeholder:"e.g. young professionals, parents, fitness enthusiasts",helpText:"Who is this product designed for?",value:o.targetAudience,onChange:u=>{o.targetAudience=u}})),l.append(e.createComponent(A,{label:"Key Features",placeholder:"e.g. waterproof, eco-friendly, machine washable, lifetime warranty",helpText:"List the main features and benefits",value:o.keyFeatures,onChange:u=>{o.keyFeatures=u}})),l.append(e.createComponent(A,{label:"Additional Notes",placeholder:"Any other important information about this product",helpText:"Optional: Add any special instructions or details",value:o.additionalNotes,onChange:u=>{o.additionalNotes=u}})),f.append(l)}if(r&&f.append(e.createComponent(I,{gap:"tight"},e.createText("\u{1F504} Analyzing images and generating description..."))),p&&!r&&f.append(e.createComponent(A,{label:"Generated Description (Review and edit as needed)",rows:8,value:p,onChange:l=>{p=l}})),!r){let l=e.createComponent(ee,{gap:"base"});p?l.append(e.createComponent(v,{variant:"primary",onPress:b},"Apply Description to Product")):l.append(e.createComponent(v,{variant:"primary",onPress:C,disabled:!c||!i},"Generate Description")),l.append(e.createComponent(v,{onPress:n},"Close")),f.append(l)}e.append(e.createComponent(V,{title:"Thunder Text AI - Generate Product Description"},f)),console.log("Thunder Text Extension: UI build completed")}});})();
//# sourceMappingURL=product-description-generator.js.map
