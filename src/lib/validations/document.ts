export function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, "");

  if (cnpj === "") return false;
  if (cnpj.length !== 14) return false;

  // Elimina CNPJs inválidos conhecidos
  if (
    cnpj === "00000000000000" ||
    cnpj === "11111111111111" ||
    cnpj === "22222222222222" ||
    cnpj === "33333333333333" ||
    cnpj === "44444444444444" ||
    cnpj === "55555555555555" ||
    cnpj === "66666666666666" ||
    cnpj === "77777777777777" ||
    cnpj === "88888888888888" ||
    cnpj === "99999999999999"
  )
    return false;

  // Valida DVs
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

export function formatCNPJ(cnpj: string): string {
  const numeric = cnpj.replace(/[^\d]/g, "");
  if (numeric.length <= 2) return numeric;
  if (numeric.length <= 5) return numeric.replace(/(\d{2})(\d{1,3})/, "$1.$2");
  if (numeric.length <= 8) return numeric.replace(/(\d{2})(\d{3})(\d{1,3})/, "$1.$2.$3");
  if (numeric.length <= 12) return numeric.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, "$1.$2.$3/$4");
  return numeric.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2}).*/, "$1.$2.$3/$4-$5");
}

export function fetchCNPJData(cnpj: string) {
  // A simple client side wrapper for BrasilAPI CNPJ
  const numeric = cnpj.replace(/[^\d]/g, "");
  return fetch(`https://brasilapi.com.br/api/cnpj/v1/${numeric}`).then((r) => {
    if (!r.ok) throw new Error("CNPJ inválido ou não encontrado");
    return r.json();
  });
}
