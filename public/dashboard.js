function addButtonEditor() {
  const wrap =
    document.getElementById(
      "buttonsWrap"
    );

  const countInput =
    document.getElementById(
      "buttonCount"
    );

  const template =
    document.getElementById(
      "buttonTemplate"
    );


  if (
    !wrap ||
    !countInput ||
    !template
  ) {
    return;
  }


  let count =
    Number(
      countInput.value || 0
    );


  if (count >= 5) {

    alert(
      "الحد الأقصى 5 أزرار في كل بانل."
    );

    return;
  }


  const node =
    template.content.cloneNode(
      true
    );


  node
    .querySelectorAll(
      "[data-name]"
    )
    .forEach(
      element => {

        const key =
          element.getAttribute(
            "data-name"
          );


        element.setAttribute(

          "name",

          `${key}_${count}`

        );


        element.removeAttribute(
          "data-name"
        );

      }
    );


  wrap.appendChild(
    node
  );


  count++;

  countInput.value =
    count;
}


// ==========================================
// REVEAL ANIMATION DELAY
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const reveals =
      document.querySelectorAll(
        ".reveal"
      );


    reveals.forEach(
      (element, index) => {

        element.style.animationDelay =
          `${Math.min(
            index * 45,
            250
          )}ms`;

      }
    );

  }
);
