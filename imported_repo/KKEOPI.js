// about us
// services offered/our product
// gallery
// contact us

/* ==========================================
   KKEOPI PRODUCTS JS
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       PRODUCT ACCORDION
    ========================= */

    const expandButtons = document.querySelectorAll(".expandButton");

    expandButtons.forEach(button => {

        button.addEventListener("click", () => {

            const card = button.closest(".productCard");

            document.querySelectorAll(".productCard").forEach(item => {

                if(item !== card){

                    item.classList.remove("active");

                }

            });

            card.classList.toggle("active");

        });

    });

    /* =========================
       CHIP SELECTOR
    ========================= */

    document.querySelectorAll(".chips").forEach(group=>{

        const chips = group.querySelectorAll(".chip");

        chips.forEach(chip=>{

            chip.addEventListener("click",()=>{

                chips.forEach(c=>c.classList.remove("active"));

                chip.classList.add("active");

            });

        });

    });

    /* =========================
       QUANTITY
    ========================= */

    document.querySelectorAll(".productCard").forEach(card=>{

        let qty = 1;

        const minus = card.querySelector(".minus");

        const plus = card.querySelector(".plus");

        const number = card.querySelector(".quantity span");

        if(minus && plus){

            plus.onclick=()=>{

                qty++;

                number.textContent=qty;

            }

            minus.onclick=()=>{

                if(qty>1){

                    qty--;

                    number.textContent=qty;

                }

            }

        }

    });

    /* =========================
       HEART
    ========================= */

    document.querySelectorAll(".heart").forEach(button=>{

        button.addEventListener("click",()=>{

            button.classList.toggle("active");

            const icon = button.querySelector("i");

            if(button.classList.contains("active")){

                icon.classList.remove("fa-regular");

                icon.classList.add("fa-solid");

            }

            else{

                icon.classList.remove("fa-solid");

                icon.classList.add("fa-regular");

            }

        });

    });

    /* =========================
       CART
    ========================= */

    let cart=0;

    const badge=document.getElementById("cartCount");

    document.querySelectorAll(".cart").forEach(button=>{

        button.addEventListener("click",()=>{

            cart++;

            badge.textContent=cart;

            showToast("Added to cart!");

            bounceCart();

        });

    });

    /* =========================
       SAVE
    ========================= */

    document.querySelectorAll(".save").forEach(button=>{

        button.onclick=()=>{

            showToast("Saved for later");

        }

    });

    /* =========================
       BUY
    ========================= */

    document.querySelectorAll(".buy").forEach(button=>{

        button.onclick=()=>{

            showToast("Proceeding to purchase...");

        }

    });

    /* =========================
       CHECKOUT
    ========================= */

    document.querySelectorAll(".checkout").forEach(button=>{

        button.onclick=()=>{

            showToast("Opening Checkout");

        }

    });

});

/* ==========================================
   TOAST
========================================== */

function showToast(text){

    let toast=document.createElement("div");

    toast.className="toast";

    toast.innerHTML=text;

    document.body.appendChild(toast);

    setTimeout(()=>{

        toast.classList.add("show");

    },20);

    setTimeout(()=>{

        toast.classList.remove("show");

        setTimeout(()=>{

            toast.remove();

        },300);

    },2200);

}

/* ==========================================
   CART BOUNCE
========================================== */

function bounceCart(){

    const cart=document.querySelector(".floatingCart");

    cart.animate([

        {

            transform:"translateY(0)"

        },

        {

            transform:"translateY(-15px)"

        },

        {

            transform:"translateY(0)"

        }

    ],{

        duration:450

    });

}

/* ==========================================
   PARALLAX
========================================== */

const glow=document.querySelector(".mouseGlow");

const wave=document.querySelector(".wave");

document.addEventListener("mousemove",(e)=>{

    const x=e.clientX;

    const y=e.clientY;

    glow.style.transform=`translate(${x-140}px,${y-140}px)`;

    const moveX=(window.innerWidth/2-x)/45;

    const moveY=(window.innerHeight/2-y)/45;

    wave.style.transform=

    `translateY(calc(-50% + ${moveY}px))
     translateX(${moveX}px)`;

});

/* ==========================================
   RIPPLE
========================================== */

document.querySelectorAll("button").forEach(button=>{

    button.addEventListener("click",(e)=>{

        const circle=document.createElement("span");

        const diameter=Math.max(button.clientWidth,button.clientHeight);

        circle.style.width=diameter+"px";

        circle.style.height=diameter+"px";

        circle.style.left=e.offsetX-diameter/2+"px";

        circle.style.top=e.offsetY-diameter/2+"px";

        circle.classList.add("ripple");

        button.appendChild(circle);

        setTimeout(()=>{

            circle.remove();

        },600);

    });

});

/* ==========================================
   FLOATING CARDS
========================================== */

document.querySelectorAll(".productCard").forEach(card=>{

    card.addEventListener("mousemove",(e)=>{

        const rect=card.getBoundingClientRect();

        const x=e.clientX-rect.left;

        const y=e.clientY-rect.top;

        const rotateY=(x-rect.width/2)/25;

        const rotateX=(rect.height/2-y)/25;

        card.style.transform=

        `perspective(1000px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        translateY(-8px)`;

    });

    card.addEventListener("mouseleave",()=>{

        card.style.transform="";

    });

});

const observer=new IntersectionObserver(entries=>{

    entries.forEach(entry=>{

        if(entry.isIntersecting){

            entry.target.classList.add("visible");

        }

    });

});

document.querySelectorAll(".productCard").forEach(card=>{

    observer.observe(card);

});