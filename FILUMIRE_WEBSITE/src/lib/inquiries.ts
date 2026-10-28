export const INQUIRY_CATEGORIES = {
 "general":"General information","learner-access":"Learner access","family":"Parent & family support","teacher":"Teacher & classroom inquiry","school-pilot":"School enquiry or demonstration","curriculum":"Curriculum & pedagogy","partnership":"Partnership"
} as const;
export const FRENCH_CATEGORIES: Record<InquiryCategory,string> = {general:"Informations générales","learner-access":"Accès des élèves",family:"Accompagnement des parents et familles",teacher:"Enseignants et utilisation en classe","school-pilot":"Demande d’école ou démonstration",curriculum:"Programme et pédagogie",partnership:"Partenariat"};
export type InquiryCategory = keyof typeof INQUIRY_CATEGORIES;
export function inquiryCategory(value:string|null|undefined):InquiryCategory {return value && Object.prototype.hasOwnProperty.call(INQUIRY_CATEGORIES,value)?value as InquiryCategory:"general";}
export type InquiryFields = {name:string;email:string;phone:string;organization:string;country:string;message:string};
export class InquiryError extends Error { constructor(public field:keyof InquiryFields|"category",message:string) {super(message);} }
export function prepareInquiry(category:InquiryCategory,fields:InquiryFields,contacts:{inquiriesEmail:string;partnershipsEmail:string;schoolsEmail:string},locale:"en"|"fr"="en") {
 const french=locale==="fr";
 const fail=(field:keyof InquiryFields|"category",en:string,fr:string):never=>{throw new InquiryError(field,french?fr:en);};
 if(!Object.prototype.hasOwnProperty.call(INQUIRY_CATEGORIES,category)) fail("category","Please choose a valid inquiry category.","Choisissez une catégorie de demande valide.");
 const name=fields.name.trim(),email=fields.email.trim(),message=fields.message.trim();
 if(!name||name.length>120||/[\r\n]/.test(name)) fail("name","Please enter your name (up to 120 characters).","Indiquez votre nom (120 caractères maximum).");
 if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||email.length>254) fail("email","Please enter a valid email address.","Indiquez une adresse e-mail valide.");
 if(message.length<10||message.length>3000) fail("message","Please enter a message between 10 and 3,000 characters.","Rédigez un message de 10 à 3 000 caractères.");
 for(const [field,max] of [["phone",40],["organization",160],["country",80]] as const) if(fields[field].length>max||/[\r\n]/.test(fields[field])) fail(field,"Please shorten this field and use a single line.","Raccourcissez ce champ et utilisez une seule ligne.");
 const proposed=category==="school-pilot"||category==="teacher"?contacts.schoolsEmail:category==="curriculum"||category==="partnership"?contacts.partnershipsEmail:contacts.inquiriesEmail;
 const recipient=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(proposed)?proposed:"";
 const label=french?FRENCH_CATEGORIES[category]:INQUIRY_CATEGORIES[category];
 const subject="FILUMIRE — "+label;
 const labels=french?["Demande","Nom","E-mail","Organisation","Pays","Téléphone","Message","Non précisé","Destinataire à confirmer"]:["Inquiry","Name","Email","Organisation","Country","Phone","Message","Not provided","Recipient to confirm"];
 const body=[labels[0]+": "+label,labels[1]+": "+name,labels[2]+": "+email,labels[3]+": "+(fields.organization.trim()||labels[7]),labels[4]+": "+(fields.country.trim()||labels[7]),labels[5]+": "+(fields.phone.trim()||labels[7]),"",labels[6]+":",message].join("\n");
 return {recipient,subject,body,text:(french?"À : ":"To: ")+(recipient||labels[8])+"\n"+(french?"Objet : ":"Subject: ")+subject+"\n\n"+body,mailto:recipient?"mailto:"+recipient+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body):null};
}
