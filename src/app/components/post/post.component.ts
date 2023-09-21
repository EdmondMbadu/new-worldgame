import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.css'],
})
export class PostComponent {
  @Input() title: string = 'Electrifying Africa';
  @Input() author: string = 'Medard Gabel';
  @Input() authorPic: string = 'medard';
  showComments: boolean = false;
  full: boolean = false;
  excerpt: string =
    'Washington, Nov. 9, 2022—The World Bank Group announced today an innovative initiative to accelerate the pace of electrification in Africa to achieve universal access by 2030. The World Bank, the Multilateral Investment Guarantee Agency (MIGA), the International Finance Corporation (IFC), and other development agencies will promote private investment in distributed renewable energy (DRE) systems to electrify targeted areas quickly and efficiently. The Distributed Access through Renewable Energy Scale-Up Platform (DARES) calls for joint action by government, private investors, and development agencies to solve Africa’s immediate needs while developing DRE solutions that can be applied globally';
  fullAritcle: string = `
  Washington, Nov. 9, 2022—The World Bank Group announced today an innovative initiative to accelerate the pace of electrification in Africa to achieve universal access by 2030. The World Bank, the Multilateral Investment Guarantee Agency (MIGA), the International Finance Corporation (IFC), and other development agencies will promote private investment in distributed renewable energy (DRE) systems to electrify targeted areas quickly and efficiently. The Distributed Access through Renewable Energy Scale-Up Platform (DARES) calls for joint action by government, private investors, and development agencies to solve Africa’s immediate needs while developing DRE solutions that can be applied globally.
  
  At current rates of electrification, over a half billion people in Sub-Saharan Africa (SSA) will still be without electricity in 2030 unless the current electrification pace is tripled. Present projections indicate that only eight SSA countries will achieve universal electricity access by 2030, and some will take over 100 years to fully electrify. The lack of energy access greatly inhibits green, resilient, and inclusive development of many countries in SSA. The expansion of access through DRE systems will answer an urgent need quickly and support climate resilience, food security, and human capital development goals.
  
  DRE systems generally involve a solar photo-voltaic station paired with battery storage. In rural communities, these systems can serve a health care facility, for example, or a group of customers such as households or businesses in a village, operating independently from the national power grid.  DRE systems can be easily installed, are reliable, and do not require the large investment needed to build a utility-scale power plant.
  
  “Now more than ever we need innovative solutions that close the energy access gap,” said Riccardo Puliti, World Bank Vice President for Infrastructure. “Bringing together government and the private sector to support distributed renewable energy can help extend electrification to the most vulnerable while also advancing clean energy.”
  
  DRE is the fastest and most cost-effective mechanism to accelerate clean electricity access on the continent. Over the last 10 years, 20 percent of all new electric connections in SSA have been through DRE systems. While DRE is now attracting private sector financing, this support is not at the scale that is needed.
  
  DARES will leverage this positive momentum to work with governments and the private sector to expand DRE investment. The World Bank Group is well-positioned to take the lead in scaling the DRE sector in SSA, using a different approach from traditional infrastructure investments to incentivize private financing commitment.
  
  “MIGA is in a strong position to support private investment through new and innovative risk mitigation solutions that are fit-for-purpose for the unique risk faced by investors,” said Hiroshi Matano, MIGA Executive Vice President. “We look forward to working with Sub-Saharan African countries to create opportunities to combine public and private investment approaches to electrify Africa in the near future.”
  
  DARES will leverage World Bank, MIGA, and IFC expertise to create a joint cross-sectoral approach to develop innovative financial and de-risking instruments to be rolled out at a regional level. The platform also provides for significant technical assistance for governments and the private sector and differentiated approaches consistent with unique country contexts and markets. A key goal in this respect is to tackle barriers to private sector participation to give SSA countries the ability to mobilize DRE systems faster, while making them, greener, more resilient, and inclusive.
  
  DARES will have five core areas: mini-grids, off-grid solar markets, systems for schools and health facilities, solar irrigation and cold chain for farmers, and innovative business models to displace diesel generation and improve access reliability.
  
  “Investing in distributed renewable energy is one of the most efficient ways to tackle energy access challenges and to support economic activities in Africa while addressing greenhouse gas emissions,” said Emmanuel Nyirinkindi, IFC Vice President of Cross-Cutting Solutions. “Mini-grid systems are one example of DRE and can efficiently deliver energy to cities and rural areas outside the limits of a national grid.”
  
  The World Bank has an active portfolio of $2.7 billion for DRE access, targeting electrification of about 40 million people. IFC has initiated the Scaling Mini Grids Program and is building on its Lighting Africa Engagement. MIGA has $83 million in DRE guarantees and a $400 million pipeline. MIGA is developing “fit-for-purpose” instruments that address the unique risks faced by distributed energy investors and is actively engaging with partners to bring together complementary solutions for its DRE clients.
  
  DARES responds to United Nations Sustainable Development Goal 7, which calls for “affordable, reliable, sustainable, and modern energy for all” by 2030. These core targets are at the platform’s foundation to ensure universal access to Sub-Saharan-Africa.
  
  The impact of this initiative goes beyond electrifying Africa. Electricity is the foundational enabler to address other critical initiatives such as food insecurity, gender equality, climate resilience, and health.  Electrification will open more options to solve these issues.  `;

  showLessOrMore() {
    if (this.full) {
      this.full = false;
    } else {
      this.full = true;
    }
  }

  displayComments() {
    if (this.showComments) {
      this.showComments = false;
    } else {
      this.showComments = true;
    }
  }
}
