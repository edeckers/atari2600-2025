export const romUploader = () => {
  const input = document.getElementById("romFile");
  const button = document.getElementById("romUploadButton");
  
  input.addEventListener("change", (e0) => {
    const reader = new FileReader();
    
    reader.addEventListener('load', (e1) => {
      const name = e0.target.value.split('\\').pop().split('/').pop();
      const romKey = `rom:${btoa(name)}`;
      
      window.localStorage.setItem(romKey, JSON.stringify({ name, data: btoa(e1.target.result) }));

      document.dispatchEvent(new Event("rom.uploaded"));
    });
    
    reader.readAsBinaryString(e0.target.files[0]);
  });


  button.addEventListener("click", () => {
    input.click();
  });
}
