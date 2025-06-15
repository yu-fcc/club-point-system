import axios from 'axios';

// Pinata API 配置
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5OWQzN2I4YS0yMDYyLTRjYTctOTgzMS1kZGMxYmJiNjIxMzIiLCJlbWFpbCI6IjE4MzM3MzkyODNAcXEuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImMzMjNkZjIyOTExNmEzNDllZWU0Iiwic2NvcGVkS2V5U2VjcmV0IjoiMWRkZWRmY2M0OTE2ZWNhMjFlZDYxNjg2YzJiNGZmODA0OTBlNzZlNTE4ZDgwN2RlMDBkNjMyMmY0YmFlMDk0MyIsImV4cCI6MTc2Mjk5NTU3MX0.fUzMJhWi0WMAHueNGcU0C3QEc41IjuzHpIT4nhIAyP0";
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export class IpfsService {
  private readonly PINATA_JWT: string;
  private readonly PINATA_GATEWAY: string;

  constructor() {
    this.PINATA_JWT = process.env.REACT_APP_PINATA_JWT || PINATA_JWT;
    this.PINATA_GATEWAY = process.env.REACT_APP_PINATA_GATEWAY || PINATA_GATEWAY;
  }

  async uploadFile(file: File): Promise<string> {
    if (!this.PINATA_JWT) {
      throw new Error('Pinata JWT not configured');
    }

    console.log('开始上传文件到 IPFS:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    const formData = new FormData();
    formData.append('file', file);

    // 添加文件元数据
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        type: file.type,
        size: file.size
      }
    });
    formData.append('pinataMetadata', metadata);

    try {
      console.log('正在发送文件到 Pinata...');
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PINATA_JWT}`
        },
        body: formData
      });

      if (!response.ok) {
        console.error('Pinata 上传失败:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`Failed to upload file: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Pinata 上传成功:', {
        ipfsHash: data.IpfsHash,
        pinSize: data.PinSize,
        timestamp: data.Timestamp
      });

      const ipfsUrl = `${this.PINATA_GATEWAY}${data.IpfsHash}`;
      console.log('生成的 IPFS URL:', ipfsUrl);
      
      return ipfsUrl;
    } catch (error) {
      console.error('上传文件到 IPFS 失败:', error);
      throw error;
    }
  }

  async uploadJson(data: any): Promise<string> {
    if (!this.PINATA_JWT) {
      throw new Error('Pinata JWT not configured');
    }

    const formData = new FormData();
    formData.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

    // 添加 JSON 元数据
    const metadata = JSON.stringify({
      name: 'data.json',
      keyvalues: {
        type: 'application/json'
      }
    });
    formData.append('pinataMetadata', metadata);

    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PINATA_JWT}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to upload JSON: ${response.statusText}`);
      }

      const result = await response.json();
      return `${this.PINATA_GATEWAY}${result.IpfsHash}`;
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error);
      throw error;
    }
  }
}

export const ipfsService = new IpfsService(); 