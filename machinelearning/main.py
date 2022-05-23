import sys
import glob
import mlGen


print("Printing from python!")

if __name__ == "__main__":
    print(f"Arguments count: {len(sys.argv)}")
    mlGen.startVPGT(sys.argv)